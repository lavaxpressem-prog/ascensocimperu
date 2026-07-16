import React, { useState, useEffect } from 'react'
import {
  Page,
  PageHeader,
  PageTitle,
  PageDescription,
  PageBody,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@blinkdotnew/ui'
import {
  Users,
  FileText,
  Newspaper,
  FolderOpen,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { getAdminStats, type AdminStats } from '../../lib/supabase'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const data = await getAdminStats()
      setStats(data)
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Usuarios Totales', value: stats?.total_users ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
    { label: 'Usuarios Activos', value: stats?.active_users ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
    { label: 'Pendientes', value: stats?.pending_users ?? 0, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
    { label: 'Bloqueados', value: stats?.locked_users ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
    { label: 'Preguntas', value: stats?.total_questions ?? 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
    { label: 'Noticias', value: stats?.total_noticias ?? 0, icon: Newspaper, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
    { label: 'Archivos', value: stats?.total_files ?? 0, icon: FolderOpen, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950' },
    { label: 'Actividad (7d)', value: stats?.recent_activity ?? 0, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950' },
  ]

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-primary" />
          <div>
            <PageTitle>Dashboard del Administrador</PageTitle>
            <PageDescription>Resumen general del sistema AscensoCIM Peru</PageDescription>
          </div>
        </div>
      </PageHeader>

      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.label} className="overflow-hidden">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${card.bg}`}>
                          <Icon size={18} className={card.color} />
                        </div>
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-foreground">
                        {card.value.toLocaleString()}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground mt-1">{card.label}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen Rápido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm text-muted-foreground">Noticias Publicadas</span>
                    <span className="font-bold text-foreground">{stats?.published_noticias ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm text-muted-foreground">Total de Inicios de Sesion</span>
                    <span className="font-bold text-foreground">{stats?.total_logins ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm text-muted-foreground">Tasa de Aprobacion</span>
                    <span className="font-bold text-foreground">
                      {stats && stats.total_users > 0
                        ? Math.round((stats.active_users / stats.total_users) * 100)
                        : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Accesos Rapidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a href="/admin/users" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <Users size={18} className="text-primary" />
                    <span className="text-sm font-medium">Gestionar Usuarios</span>
                  </a>
                  <a href="/admin/questions" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <FileText size={18} className="text-primary" />
                    <span className="text-sm font-medium">Banco de Preguntas</span>
                  </a>
                  <a href="/admin/news" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <Newspaper size={18} className="text-primary" />
                    <span className="text-sm font-medium">Gestionar Noticias</span>
                  </a>
                  <a href="/admin/security" className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <Activity size={18} className="text-primary" />
                    <span className="text-sm font-medium">Registro de Actividad</span>
                  </a>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </Page>
  )
}
