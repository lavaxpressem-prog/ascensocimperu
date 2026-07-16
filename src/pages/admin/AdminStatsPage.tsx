import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card } from '@blinkdotnew/ui'
import { BarChart3, Users, FileText, Newspaper, FolderOpen, Activity, LogIn, CheckCircle } from 'lucide-react'
import { getAdminStats, type AdminStats } from '../../lib/supabase'

export function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const data = await getAdminStats(); setStats(data); setLoading(false)
    }
    load()
  }, [])

  const metrics = [
    { label: 'Usuarios Registrados', value: stats?.total_users ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
    { label: 'Usuarios Activos', value: stats?.active_users ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
    { label: 'Pendientes de Aprobacion', value: stats?.pending_users ?? 0, icon: Users, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
    { label: 'Usuarios Bloqueados', value: stats?.locked_users ?? 0, icon: Users, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
    { label: 'Total de Preguntas', value: stats?.total_questions ?? 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
    { label: 'Noticias Publicadas', value: stats?.published_noticias ?? 0, icon: Newspaper, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
    { label: 'Archivos Subidos', value: stats?.total_files ?? 0, icon: FolderOpen, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950' },
    { label: 'Inicios de Sesion', value: stats?.total_logins ?? 0, icon: LogIn, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950' },
    { label: 'Actividad Reciente (7d)', value: stats?.recent_activity ?? 0, icon: Activity, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950' },
  ]

  const approvalRate = stats && stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-primary" />
          <div>
            <PageTitle>Estadisticas del Sistema</PageTitle>
            <PageDescription> metricas detalladas de uso y actividad</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {metrics.map(m => {
                const Icon = m.icon
                return (
                  <Card key={m.label} className="p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${m.bg}`}><Icon size={18} className={m.color} /></div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-foreground">{m.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Resumen General</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tasa de Aprobacion de Cuentas</span><span className="font-bold text-foreground">{approvalRate}%</span></div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${approvalRate}%` }} /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Noticias Publicadas vs Total</span><span className="font-bold text-foreground">{stats?.published_noticias ?? 0}/{stats?.total_noticias ?? 0}</span></div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${stats && stats.total_noticias > 0 ? (stats.published_noticias / stats.total_noticias) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Usuarios con Acceso</span><span className="font-bold text-foreground">{stats?.active_users ?? 0}/{stats?.total_users ?? 0}</span></div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats && stats.total_users > 0 ? (stats.active_users / stats.total_users) * 100 : 0}%` }} /></div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Informacion del Sistema</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><span className="text-sm text-muted-foreground">Plataforma</span><span className="text-sm font-medium text-foreground">AscensoCIM Peru</span></div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><span className="text-sm text-muted-foreground">Version</span><span className="text-sm font-medium text-foreground">1.0.0</span></div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><span className="text-sm text-muted-foreground">Base de Datos</span><span className="text-sm font-medium text-foreground">Supabase PostgreSQL</span></div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><span className="text-sm text-muted-foreground">Frontend</span><span className="text-sm font-medium text-foreground">React + Vite + TypeScript</span></div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><span className="text-sm text-muted-foreground">UI Library</span><span className="text-sm font-medium text-foreground">@blinkdotnew/ui</span></div>
                </div>
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </Page>
  )
}
