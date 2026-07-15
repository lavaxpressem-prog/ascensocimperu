import { createBrowserClient } from '@supabase/ssr'
import type { Profile, ModuleWithAccess, ActivityLog } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ──

export async function signUp(email: string, password: string, metadata: Record<string, string>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

// ── Profile helpers ──

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

// ── Admin helpers ──

export async function getPendingUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Profile[]
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Profile[]
}

export async function approveUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'approved' })
    .eq('id', userId)
  if (error) throw error
}

export async function rejectUser(userId: string) {
  // Cannot delete auth users from browser client (requires service_role key).
  // Mark as suspended instead so they cannot log in.
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId)
  if (error) throw error
}

export async function suspendUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId)
  if (error) throw error
}

// ── Module helpers ──

export async function getUserModules(userId: string): Promise<ModuleWithAccess[]> {
  const { data, error } = await supabase
    .rpc('get_user_modules', { p_user_id: userId })
  if (error) throw error
  return data as ModuleWithAccess[]
}

export async function checkModuleAccess(userId: string, moduleSlug: string): Promise<boolean> {
  const modules = await getUserModules(userId)
  const mod = modules.find(m => m.slug === moduleSlug)
  if (!mod) return false
  return !mod.blocked && mod.can_access
}

export async function blockModule(userId: string, moduleId: string, reason?: string) {
  const { error } = await supabase
    .from('blocked_modules')
    .upsert({ user_id: userId, module_id: moduleId, reason })
  if (error) throw error
}

export async function unblockModule(userId: string, moduleId: string) {
  const { error } = await supabase
    .from('blocked_modules')
    .delete()
    .eq('user_id', userId)
    .eq('module_id', moduleId)
  if (error) throw error
}

// ── Activity logs ──

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, profiles!inner(email, name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as unknown as ActivityLog[]
}

export async function logActivity(action: string, details?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action,
    details: details ?? null,
  })
}

// ── Dashboard stats helpers ──

export interface DashboardStats {
  dias_estudiados: number
  horas_estudio: number
  ultimo_estudio: string | null
  promedio_aprendizaje: number
  total_examenes: number
  preguntas_respondidas: number
  examenes_aprobados: number
  simuladores_realizados: number
  preguntas_correctas: number
}

export interface RankingEntry {
  user_id: string
  full_name: string
  grade: string
  average_score: number
  total_exams: number
  total_questions: number
  correct_answers: number
}

export interface TopPerformer {
  user_id: string
  full_name: string
  grade: string
  average_score: number
  total_score: number
  exam_count: number
}

export async function getUserDashboardStats(userId: string): Promise<DashboardStats | null> {
  const { data, error } = await supabase
    .rpc('get_user_dashboard_stats', { p_user_id: userId })
    .single()
  if (error) return null
  return data as DashboardStats
}

export async function getUserRankingByGrade(): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .rpc('get_user_ranking_by_grade')
  if (error) return []
  return (data || []) as RankingEntry[]
}

export async function getTopPerformerOfWeek(): Promise<TopPerformer | null> {
  const { data, error } = await supabase
    .rpc('get_top_performer_of_week')
    .single()
  if (error) return null
  return data as TopPerformer
}

export async function recordStudySession(session: {
  activity_type: string
  started_at?: string
  ended_at?: string
  duration_seconds?: number
  questions_attempted?: number
  questions_correct?: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_study_sessions').insert({
    user_id: user.id,
    ...session,
  })
  if (error) throw error
}

export async function recordExamResult(result: {
  exam_type: string
  total_questions: number
  correct_answers: number
  score_percentage: number
  time_spent_seconds?: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_exam_results').insert({
    user_id: user.id,
    ...result,
  })
  if (error) throw error
}

export async function recordQuestionResponse(response: {
  question_identifier?: string
  selected_option: string
  is_correct: boolean
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_question_responses').insert({
    user_id: user.id,
    ...response,
  })
  if (error) throw error
}

// ── Questions helpers ──

export interface Question {
  id: number
  topic: string
  text: string
  options: { id: string; text: string }[]
  correctOption: string
  respuestaCorrecta: string
  indiceCorrecto: number
  ubicacion?: string
}

interface QuestionRow {
  id: number
  numero: number
  materia_id: number
  pregunta: string
  opciones: { id: string; text: string }[] | string
  respuesta_correcta: string
  indice_correcto: number
  ubicacion: string | null
  codigo: string | null
  created_at: string
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const PAGE_SIZE = 1000

function rowToQuestion(row: QuestionRow): Question {
  let options: { id: string; text: string }[]

  if (Array.isArray(row.opciones)) {
    options = row.opciones.map((opt, i) => ({
      id: opt.id || LETTERS[i] || String(i),
      text: opt.text || String(opt),
    }))
  } else if (typeof row.opciones === 'string') {
    try {
      const parsed = JSON.parse(row.opciones)
      if (Array.isArray(parsed)) {
        options = parsed.map((opt: any, i: number) => ({
          id: opt.id || LETTERS[i] || String(i),
          text: opt.text || String(opt),
        }))
      } else {
        options = []
      }
    } catch {
      options = []
    }
  } else {
    options = []
  }

  const correctOption = LETTERS[row.indice_correcto] ?? String(row.indice_correcto)

  return {
    id: row.id,
    topic: String(row.materia_id),
    text: row.pregunta,
    options,
    correctOption,
    respuestaCorrecta: row.respuesta_correcta,
    indiceCorrecto: row.indice_correcto,
    ubicacion: row.ubicacion ?? undefined,
  }
}

const PREGUNTAS_COLUMNS = 'id, numero, materia_id, pregunta, opciones, respuesta_correcta, indice_correcto, ubicacion, codigo, created_at'

async function fetchAllPreguntas(opts?: { materia_id?: number }): Promise<QuestionRow[]> {
  const allRows: QuestionRow[] = []
  let offset = 0
  const filters = opts?.materia_id

  while (true) {
    let query = supabase
      .from('preguntas')
      .select(PREGUNTAS_COLUMNS)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (filters !== undefined) {
      query = query.eq('materia_id', filters)
    }

    const { data, error } = await query

    if (error) break
    if (!data || data.length === 0) break

    allRows.push(...(data as QuestionRow[]))

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return allRows
}

export async function getQuestionsBatch(): Promise<Question[]> {
  const rows = await fetchAllPreguntas()
  return rows.map(rowToQuestion)
}

export async function getQuestionsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('preguntas')
    .select('id', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

export async function getQuestionsByMateria(materiaId: number): Promise<Question[]> {
  const rows = await fetchAllPreguntas({ materia_id: materiaId })
  return rows.map(rowToQuestion)
}

export async function getRandomQuestions(count: number): Promise<Question[]> {
  const rows = await fetchAllPreguntas()
  const shuffled = rows.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(rowToQuestion)
}

// ── Topics helpers ──

export interface TopicWithCount {
  id: number
  nombre: string
  count: number
}

export async function getTopicsWithCount(): Promise<TopicWithCount[]> {
  const { data, error } = await supabase
    .from('materias')
    .select('id, nombre, preguntas(count)')
  if (error) return []
  const topics = (data ?? [])
    .map((m: any) => ({
      id: m.id,
      nombre: m.nombre,
      count: m.preguntas?.[0]?.count ?? 0,
    }))
    .filter((t: TopicWithCount) => t.count > 0)
    .sort((a: TopicWithCount, b: TopicWithCount) => a.nombre.localeCompare(b.nombre))
  return topics
}

// ── Session helpers ──

export function getCurrentSession() {
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback)
}
