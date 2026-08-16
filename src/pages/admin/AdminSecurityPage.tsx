import React, { useState, useEffect, useCallback } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button } from '@blinkdotnew/ui'
import { Shield, Activity, Clock, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { getAuditLogs, type AuditLogEntry } from '../../lib/supabase'

export function AdminSecurityPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLogs(100)
      setLogs(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar registros de actividad'
      setError(message)
      console.error('Error loading audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: 'Inicio de sesion',
      logout: 'Cierre de sesion',
      login_failed: 'Intento de login fallido',
      approve_user: 'Aprobo usuario',
      reject_user: 'Rechazo usuario',
      suspend_user: 'Suspendio usuario',
      lock_user: 'Bloqueo usuario',
      unlock_user: 'Desbloqueo usuario',
      change_role: 'Cambio rol',
      create_question: 'Creo pregunta',
      update_question: 'Actualizo pregunta',
      delete_question: 'Elimino pregunta',
      import_questions: 'Importo preguntas',
      create_noticia: 'Creo noticia',
      update_noticia: 'Actualizo noticia',
      delete_noticia: 'Elimino noticia',
      toggle_noticia: 'Cambio estado noticia',
      toggle_module: 'Cambio estado modulo',
      upload_file: 'Subio archivo',
      delete_file: 'Elimino archivo',
      update_settings: 'Actualizo configuracion',
    }
    return labels[action] || action
  }

  const actionColor = (action: string) => {
    if (action.includes('delete') || action.includes('reject') || action.includes('suspend') || action.includes('lock') || action.includes('fail')) return 'text-red-600'
    if (action.includes('create') || action.includes('approve') || action.includes('upload') || action.includes('unlock') || action.includes('login')) return 'text-green-600'
    if (action.includes('update') || action.includes('change') || action.includes('toggle')) return 'text-blue-600'
    return 'text-muted-foreground'
  }

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-primary" />
          <div>
            <PageTitle>Seguridad y Auditoria</PageTitle>
            <PageDescription>Registro de acciones del administrador y historial de cambios</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        <Card className="p-4">
          <Link to="/admin/security/audit" className="flex items-center justify-between gap-4 group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">Sistema de Auditoria Completo</h3>
                <p className="text-sm text-muted-foreground">Registro de actividades, sesiones de usuarios, analisis de seguridad y exportacion de reportes</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Cargando registros...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center">
              <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={load} variant="outline" className="gap-2">
                <RefreshCw size={16} />
                Reintentar
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Activity size={20} className="text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">{logs.length}</div>
                    <div className="text-xs text-muted-foreground">Total Acciones</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">{logs.filter(l => l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()).length}</div>
                    <div className="text-xs text-muted-foreground">Ultimos 7 dias</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">{logs.filter(l => l.created_at > new Date(Date.now() - 24 * 3600000).toISOString()).length}</div>
                    <div className="text-xs text-muted-foreground">Ultimas 24h</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Registro de Actividad Reciente</h3>
                <Button onClick={load} variant="ghost" size="sm" className="gap-1">
                  <RefreshCw size={14} /> Actualizar
                </Button>
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[500px]">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Admin</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Accion</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Detalles</th>
                  </tr></thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-foreground">{log.user_name || 'Admin'}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">{log.user_email}</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-sm font-medium ${actionColor(log.action)}`}>{actionLabel(log.action)}</span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.length === 0 && <p className="text-center text-muted-foreground py-8">No hay registros de actividad</p>}
            </Card>
          </>
        )}
      </PageBody>
    </Page>
  )
}
