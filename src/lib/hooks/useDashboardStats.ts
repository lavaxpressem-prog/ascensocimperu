import { useState, useEffect, useCallback } from 'react'
import { supabase, getUserDashboardStats, getUserRankingByGrade, getTopPerformerOfWeek } from '../supabase'
import { useAuth } from '../AuthProvider'
import type { DashboardStats, RankingEntry, TopPerformer } from '../supabase'

interface DashboardData {
  stats: DashboardStats | null
  ranking: RankingEntry[]
  topPerformer: TopPerformer | null
  loading: boolean
  refresh: () => Promise<void>
}

const EMPTY_STATS: DashboardStats = {
  dias_estudiados: 0,
  horas_estudio: 0,
  ultimo_estudio: null,
  promedio_aprendizaje: 0,
  total_examenes: 0,
  preguntas_respondidas: 0,
  examenes_aprobados: 0,
  simuladores_realizados: 0,
  preguntas_correctas: 0,
}

export function useDashboardStats(): DashboardData {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [topPerformer, setTopPerformer] = useState<TopPerformer | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const [statsData, rankingData, topData] = await Promise.all([
        getUserDashboardStats(user.id),
        getUserRankingByGrade(),
        getTopPerformerOfWeek(),
      ])

      setStats(statsData || EMPTY_STATS)
      setRanking(rankingData)
      setTopPerformer(topData)
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Subscribe to real-time changes on the stats tables
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_study_sessions' },
        () => { fetchAll() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_exam_results' },
        () => { fetchAll() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_question_responses' },
        () => { fetchAll() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchAll])

  return {
    stats,
    ranking,
    topPerformer,
    loading,
    refresh: fetchAll,
  }
}
