import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Badge, Button, Input } from '@blinkdotnew/ui'
import {
  Shield, Activity, Users, AlertTriangle, Clock, Search, Download,
  ChevronDown, ChevronUp, Eye, X, Calendar, RefreshCw, FileText,
  TrendingUp, Lock, Unlock, UserPlus, Trash2, Settings, BookOpen,
  BarChart3, Zap, Play, Pause
} from 'lucide-react'
import {
  getAuditLogsFiltered,
  getAuditStatsData,
  getUserSessionsData,
  runAuditAnalysis,
  getAuditActions,
  getAuditModules,
  type AuditLogEntryExtended,
  type AuditStats,
  type UserSessionEntry,
  type AuditAnalysisEntry,
} from '../../lib/supabase'

type PeriodFilter = '24h' | '7d' | '30d' | 'all' | 'custom'

function getDateRange(period: PeriodFilter, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  const now = new Date()
  switch (period) {
    case '24h':
      return { from: new Date(now.getTime() - 24 * 3600000).toISOString(), to: now.toISOString() }
    case '7d':
      return { from: new Date(now.getTime() - 7 * 86400000).toISOString(), to: now.toISOString() }
    case '30d':
      return { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to: now.toISOString() }
    case 'custom':
      return { from: customFrom || null, to: customTo ? customTo + 'T23:59:59Z' : null }
    default:
      return { from: null, to: null }
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesion',
  logout: 'Cierre de sesion',
  login_failed: 'Intento de login fallido',
  create_user: 'Creacion de usuario',
  update_user: 'Edicion de usuario',
  delete_user: 'Eliminacion de usuario',
  approve_user: 'Aprobacion de usuario',
  reject_user: 'Rechazo de usuario',
  suspend_user: 'Suspension de usuario',
  lock_user: 'Bloqueo de usuario',
  unlock_user: 'Desbloqueo de usuario',
  change_role: 'Cambio de rol',
  create_question: 'Creacion de pregunta',
  update_question: 'Actualizacion de pregunta',
  delete_question: 'Eliminacion de pregunta',
  import_questions: 'Importacion de preguntas',
  create_noticia: 'Creacion de noticia',
  update_noticia: 'Actualizacion de noticia',
  delete_noticia: 'Eliminacion de noticia',
  toggle_noticia: 'Cambio estado noticia',
  toggle_module: 'Cambio estado modulo',
  upload_file: 'Subida de archivo',
  delete_file: 'Eliminacion de archivo',
  update_settings: 'Actualizacion de configuracion',
  access_module: 'Acceso a modulo',
  data_change: 'Cambio de datos',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function actionColor(action: string): string {
  if (action.includes('delete') || action.includes('reject') || action.includes('suspend') || action.includes('lock') || action.includes('fail')) return 'text-red-600'
  if (action.includes('create') || action.includes('approve') || action.includes('upload') || action.includes('unlock') || action.includes('login')) return 'text-green-600'
  if (action.includes('update') || action.includes('change') || action.includes('toggle') || action.includes('edit')) return 'text-blue-600'
  return 'text-muted-foreground'
}

function severityBadge(severity: string) {
  switch (severity) {
    case 'critical': return <Badge variant="destructive">Critico</Badge>
    case 'warning': return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-white">Advertencia</Badge>
    default: return <Badge variant="secondary">Normal</Badge>
  }
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <Unlock size={14} />,
  logout: <Lock size={14} />,
  login_failed: <AlertTriangle size={14} />,
  create_user: <UserPlus size={14} />,
  delete_user: <Trash2 size={14} />,
  update_settings: <Settings size={14} />,
  access_module: <BookOpen size={14} />,
}

export function AdminAuditPage() {
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [logs, setLogs] = useState<AuditLogEntryExtended[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [sessions, setSessions] = useState<UserSessionEntry[]>([])
  const [auditResult, setAuditResult] = useState<AuditAnalysisEntry[]>([])
  const [auditError, setAuditError] = useState<string | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [modules, setModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50

  const [period, setPeriod] = useState<PeriodFilter>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [selectedLog, setSelectedLog] = useState<AuditLogEntryExtended | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'sessions' | 'audit'>('activity')
  const [showFilters, setShowFilters] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { from, to } = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo])

  const loadStats = useCallback(async () => {
    const s = await getAuditStatsData()
    setStats(s)
  }, [])

  const loadLogs = useCallback(async () => {
    const result = await getAuditLogsFiltered({
      limit: pageSize,
      offset: page * pageSize,
      from: from || undefined,
      to: to || undefined,
      action: filterAction || undefined,
      module: filterModule || undefined,
      status: filterStatus || undefined,
      search: search || undefined,
    })
    setLogs(result)
    if (result.length > 0) {
      setTotalLogs(result[0].total_count)
    }
  }, [page, from, to, filterAction, filterModule, filterStatus, search])

  const loadSessions = useCallback(async () => {
    const s = await getUserSessionsData({ limit: 50, from: from || undefined, to: to || undefined })
    setSessions(s)
  }, [from, to])

  const loadFilters = useCallback(async () => {
    const [a, m] = await Promise.all([getAuditActions(), getAuditModules()])
    setActions(a)
    setModules(m)
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadStats(), loadLogs(), loadSessions(), loadFilters()])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al cargar datos de auditoria'
        setError(message)
        console.error('Error loading audit data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadStats, loadLogs, loadSessions, loadFilters])

  useEffect(() => {
    if (period !== 'custom') {
      setPage(0)
    }
  }, [period])

  useEffect(() => {
    setPage(0)
  }, [from, to, filterAction, filterModule, filterStatus, search])

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setSearch(value), 400)
  }

  const handleRunAudit = async () => {
    setLoadingAudit(true)
    setAuditError(null)
    try {
      const result = await runAuditAnalysis()
      setAuditResult(result)
      setActiveTab('audit')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al ejecutar analisis de auditoria'
      setAuditError(message)
      console.error('Error running audit:', err)
    } finally {
      setLoadingAudit(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Rol', 'Accion', 'Modulo', 'Estado', 'IP', 'Navegador', 'Admin', 'Detalles']
    const rows = logs.map(l => [
      formatDate(l.created_at),
      l.user_email,
      l.user_role || '-',
      actionLabel(l.action),
      l.module || '-',
      l.status,
      l.ip_address || '-',
      l.user_agent || '-',
      l.admin_email || '-',
      l.details ? JSON.stringify(l.details) : '-',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadFile(csv, 'auditoria.csv', 'text/csv')
  }

  const handleExportExcel = () => {
    const headers = ['Fecha', 'Usuario', 'Rol', 'Accion', 'Modulo', 'Estado', 'IP', 'Navegador', 'Admin', 'Detalles']
    const rows = logs.map(l => [
      formatDate(l.created_at),
      l.user_email,
      l.user_role || '-',
      actionLabel(l.action),
      l.module || '-',
      l.status,
      l.ip_address || '-',
      l.user_agent || '-',
      l.admin_email || '-',
      l.details ? JSON.stringify(l.details) : '-',
    ])
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Auditoria">
  <Table>${[headers, ...rows].map(r =>
    `<Row>${r.map(c => `<Cell><Data ss:Type="String">${String(c).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('')}</Row>`
  ).join('')}</Table>
 </Worksheet>
</Workbook>`
    downloadFile(xml, 'auditoria.xml', 'application/vnd.ms-excel')
  }

  const handleExportPDF = () => {
    const content = [
      'REPORTE DE AUDITORIA - AscensoCIM Peru',
      `Fecha: ${new Date().toLocaleString('es-PE')}`,
      `Periodo: ${period === 'all' ? 'Todo el historial' : period === '24h' ? 'Ultimas 24 horas' : period === '7d' ? 'Ultimos 7 dias' : period === '30d' ? 'Ultimos 30 dias' : 'Personalizado'}`,
      `Total registros: ${totalLogs}`,
      '',
      'FECHA | USUARIO | ROL | ACCION | MODULO | ESTADO | IP | ADMIN',
      '-'.repeat(100),
      ...logs.map(l =>
        `${formatDate(l.created_at)} | ${l.user_email} | ${l.user_role || '-'} | ${actionLabel(l.action)} | ${l.module || '-'} | ${l.status} | ${l.ip_address || '-'} | ${l.admin_email || '-'}`
      )
    ].join('\n')
    downloadFile(content, 'auditoria.txt', 'text/plain')
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(totalLogs / pageSize)

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-primary" />
            <div>
              <PageTitle>Auditoria y Seguridad</PageTitle>
              <PageDescription>Registro completo de actividades, sesiones y eventos de seguridad</PageDescription>
            </div>
          </div>
          <Button onClick={handleRunAudit} disabled={loadingAudit} className="gap-2">
            {loadingAudit ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            {loadingAudit ? 'Analizando...' : 'Iniciar auditoria'}
          </Button>
        </div>
      </PageHeader>

      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Cargando datos de auditoria...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center">
              <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => {
                setLoading(true)
                setError(null)
                const load = async () => {
                  try {
                    await Promise.all([loadStats(), loadLogs(), loadSessions(), loadFilters()])
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Error al cargar datos de auditoria'
                    setError(message)
                  } finally {
                    setLoading(false)
                  }
                }
                load()
              }} variant="outline" className="gap-2">
                <RefreshCw size={16} />
                Reintentar
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{stats.active_users}</div>
                      <div className="text-xs text-muted-foreground">Usuarios activos</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={20} className="text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{stats.logins_24h}</div>
                      <div className="text-xs text-muted-foreground">Ingresos 24h</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Activity size={20} className="text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{stats.total_actions}</div>
                      <div className="text-xs text-muted-foreground">Acciones (30d)</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-600" />
                    <div>
                      <div className="text-2xl font-bold">{stats.failed_attempts}</div>
                      <div className="text-xs text-muted-foreground">Intentos fallidos</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Zap size={20} className="text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{stats.active_sessions}</div>
                      <div className="text-xs text-muted-foreground">Sesiones activas</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Shield size={20} className="text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{stats.security_events}</div>
                      <div className="text-xs text-muted-foreground">Eventos seguridad</div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-2">
              {[
                { key: 'activity' as const, label: 'Registro de Actividad', icon: <FileText size={16} /> },
                { key: 'sessions' as const, label: 'Sesiones de Usuarios', icon: <Users size={16} /> },
                { key: 'audit' as const, label: 'Auditoria Manual', icon: <Search size={16} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                {/* Filters Bar */}
                <Card className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                          placeholder="Buscar por usuario, accion, modulo..."
                          className="pl-9"
                          onChange={(e) => handleSearch(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
                        {([
                          ['24h', '24h'],
                          ['7d', '7d'],
                          ['30d', '30d'],
                          ['all', 'Todo'],
                        ] as const).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setPeriod(key)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              period === key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          onClick={() => setPeriod('custom')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            period === 'custom' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Calendar size={14} />
                        </button>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                        Filtros
                        {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
                          <Download size={14} /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1">
                          <Download size={14} /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
                          <Download size={14} /> PDF
                        </Button>
                      </div>
                    </div>

                    {period === 'custom' && (
                      <div className="flex gap-3 items-center">
                        <span className="text-sm text-muted-foreground">Desde:</span>
                        <Input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="w-auto"
                        />
                        <span className="text-sm text-muted-foreground">Hasta:</span>
                        <Input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="w-auto"
                        />
                      </div>
                    )}

                    {showFilters && (
                      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Accion</label>
                          <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
                          >
                            <option value="">Todas</option>
                            {actions.map(a => (
                              <option key={a} value={a}>{actionLabel(a)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Modulo</label>
                          <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
                          >
                            <option value="">Todos</option>
                            {modules.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Estado</label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
                          >
                            <option value="">Todos</option>
                            <option value="success">Exitoso</option>
                            <option value="failed">Fallido</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFilterAction('')
                              setFilterModule('')
                              setFilterStatus('')
                              setSearch('')
                            }}
                          >
                            Limpiar filtros
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Activity Table */}
                <Card>
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Registro de Actividad</h3>
                    <span className="text-sm text-muted-foreground">{totalLogs} registros</span>
                  </div>
                  <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Fecha</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Usuario</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Rol</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Accion</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Modulo</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Estado</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Admin</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">IP</th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map(log => (
                          <tr
                            key={log.id}
                            className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                            onClick={() => setSelectedLog(log)}
                          >
                            <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(log.created_at)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-sm font-medium truncate max-w-[150px]">{log.user_name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">{log.user_email}</div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={log.user_role === 'admin' ? 'destructive' : log.user_role === 'supervisor' ? 'default' : 'secondary'} className="text-xs">
                                {log.user_role || '-'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <div className={`flex items-center gap-1.5 text-sm font-medium ${actionColor(log.action)}`}>
                                {ACTION_ICONS[log.action] || <Activity size={14} />}
                                {actionLabel(log.action)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-xs text-muted-foreground">{log.module || '-'}</td>
                            <td className="py-3 px-3">
                              <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'} className="text-xs">
                                {log.status === 'success' ? 'Exitoso' : 'Fallido'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-xs text-muted-foreground">{log.admin_email || '-'}</td>
                            <td className="py-3 px-3 text-xs text-muted-foreground font-mono">{log.ip_address || '-'}</td>
                            <td className="py-3 px-3">
                              <Eye size={14} className="text-muted-foreground hover:text-foreground" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {logs.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No hay registros de actividad para los filtros seleccionados</p>
                  )}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border">
                      <span className="text-sm text-muted-foreground">
                        Pagina {page + 1} de {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <Card>
                <div className="p-4 border-b border-border">
                  <h3 className="text-lg font-semibold">Sesiones de Usuarios</h3>
                  <p className="text-sm text-muted-foreground mt-1">Historial de ingresos y duracion de sesiones</p>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Usuario</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Rol</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Ingreso</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Salida</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Duracion</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Estado</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">IP</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="py-3 px-3">
                            <div className="text-sm font-medium">{s.user_name}</div>
                            <div className="text-xs text-muted-foreground">{s.user_email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={s.user_role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                              {s.user_role || '-'}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(s.login_at)}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                            {s.logout_at ? formatDate(s.logout_at) : '-'}
                          </td>
                          <td className="py-3 px-3 text-sm font-medium">
                            {formatDuration(s.is_active
                              ? Math.floor((Date.now() - new Date(s.login_at).getTime()) / 1000)
                              : s.duration_seconds
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {s.is_active ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Conectado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground">Desconectado</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground font-mono">{s.ip_address || '-'}</td>
                          <td className="py-3 px-3 text-sm text-center">{s.total_logins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sessions.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">No hay sesiones registradas en el periodo seleccionado</p>
                )}
              </Card>
            )}

            {/* Manual Audit Tab */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                {auditError && (
                  <Card className="p-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Error en el analisis</h4>
                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">{auditError}</p>
                        <Button onClick={handleRunAudit} disabled={loadingAudit} variant="outline" size="sm" className="mt-3 gap-2">
                          <RefreshCw size={14} />
                          Reintentar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
                {auditResult.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Search size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Auditoria Manual</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Haz clic en "Iniciar auditoria" para analizar los registros disponibles y detectar
                      actividades inusuales, intentos de acceso fallidos y eventos de seguridad.
                    </p>
                    <Button onClick={handleRunAudit} disabled={loadingAudit} className="gap-2">
                      {loadingAudit ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                      {loadingAudit ? 'Analizando...' : 'Iniciar auditoria'}
                    </Button>
                  </Card>
                ) : (
                  auditResult.map((entry, i) => (
                    <Card key={i} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {severityBadge(entry.severity)}
                            <h4 className="text-base font-semibold">{entry.title}</h4>
                            <Badge variant="outline" className="text-xs">{entry.count} registros</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{entry.description}</p>
                          {entry.details && (
                            <div className="bg-secondary/30 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                              <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Activity Detail Modal */}
            {selectedLog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedLog(null)} />
                <div className="relative bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                  <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Detalle de Actividad</h3>
                    <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg hover:bg-secondary">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Usuario</label>
                        <div className="text-sm font-medium">{selectedLog.user_name}</div>
                        <div className="text-xs text-muted-foreground">{selectedLog.user_email}</div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Rol</label>
                        <Badge variant={selectedLog.user_role === 'admin' ? 'destructive' : 'secondary'}>
                          {selectedLog.user_role || '-'}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Fecha y Hora</label>
                        <div className="text-sm">{formatDate(selectedLog.created_at)}</div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Estado</label>
                        <Badge variant={selectedLog.status === 'success' ? 'secondary' : 'destructive'}>
                          {selectedLog.status === 'success' ? 'Exitoso' : 'Fallido'}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground block mb-1">Accion</label>
                        <div className={`text-sm font-semibold ${actionColor(selectedLog.action)}`}>
                          {actionLabel(selectedLog.action)}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Modulo</label>
                        <div className="text-sm">{selectedLog.module || '-'}</div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">IP</label>
                        <div className="text-sm font-mono">{selectedLog.ip_address || '-'}</div>
                      </div>
                      {selectedLog.admin_email && (
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground block mb-1">Admin responsable</label>
                          <div className="text-sm font-medium">{selectedLog.admin_name}</div>
                          <div className="text-xs text-muted-foreground">{selectedLog.admin_email}</div>
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground block mb-1">Navegador/Dispositivo</label>
                        <div className="text-xs text-muted-foreground break-all">{selectedLog.user_agent || '-'}</div>
                      </div>
                      {selectedLog.details && (
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground block mb-1">Detalles</label>
                          <div className="bg-secondary/30 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                            <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </Page>
  )
}
