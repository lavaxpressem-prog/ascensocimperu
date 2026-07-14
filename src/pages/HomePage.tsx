import React, { useState } from 'react'
import { 
  Page, 
  PageHeader, 
  PageTitle, 
  PageDescription, 
  PageBody, 
  Stat, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  DataTable,
  Input,
  Badge,
  Persona
} from '@blinkdotnew/ui'
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Search, 
  Trophy, 
  User as UserIcon,
  ChevronRight,
  Target,
  BookOpen,
  GraduationCap
} from 'lucide-react'
import { useAuth } from '../lib/AuthProvider'
import { useDashboardStats } from '../lib/hooks/useDashboardStats'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin datos'
  const d = new Date(dateStr)
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC']
  return `${String(d.getDate()).padStart(2,'0')}${months[d.getMonth()]}${d.getFullYear()}`
}

export function HomePage() {
  const { user, profile } = useAuth()
  const { stats, ranking, topPerformer, loading } = useDashboardStats()
  const [searchQuery, setSearchQuery] = useState('')

  const userName = profile?.name || user?.email?.split('@')[0] || 'Oficial'

  const rankingWithPosition = ranking.map((r, i) => ({
    ...r,
    position: i + 1,
  }))

  const columns = [
    { 
      accessorKey: 'position', 
      header: 'Puesto',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          {row.original.position <= 3 ? (
            <Trophy size={16} className={
              row.original.position === 1 ? 'text-yellow-500' :
              row.original.position === 2 ? 'text-slate-400' :
              'text-amber-600'
            } />
          ) : null}
          <span className="font-semibold">{row.original.position}°</span>
        </div>
      )
    },
    { 
      accessorKey: 'full_name', 
      header: 'Suboficial',
      cell: ({ row }: any) => <Persona name={row.original.full_name || 'Sin nombre'} subtitle={row.original.grade} />
    },
    { 
      accessorKey: 'average_score', 
      header: 'Puntaje',
      cell: ({ row }: any) => (
        <Badge variant={row.original.average_score >= 90 ? 'default' : 'secondary'}>
          {row.original.average_score}%
        </Badge>
      )
    }
  ]

  const filteredRanking = rankingWithPosition.filter(item => 
    (item.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.grade || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <PageTitle className="font-serif text-3xl">Bienvenido, {userName}</PageTitle>
          <PageDescription>Panel de control y estadísticas de aprendizaje</PageDescription>
        </div>
      </PageHeader>
      
      <PageBody className="space-y-8">
        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat 
            label="Días Estudiados" 
            value={loading ? '...' : String(stats?.dias_estudiados ?? 0)} 
            icon={<Calendar className="text-primary" />} 
            description="Total acumulado"
          />
          <Stat 
            label="Horas de Estudio" 
            value={loading ? '...' : String(stats?.horas_estudio ?? 0)} 
            icon={<Clock className="text-primary" />} 
            description="Horas registradas"
          />
          <Stat 
            label="Último Estudio" 
            value={loading ? '...' : formatDate(stats?.ultimo_estudio ?? null)} 
            icon={<Target className="text-primary" />} 
            description="Fecha del último acceso"
          />
          <Stat 
            label="Promedio Aprendizaje" 
            value={loading ? '...' : `${stats?.promedio_aprendizaje ?? 0}%`} 
            trend={stats?.promedio_aprendizaje ? Number(stats.promedio_aprendizaje) : undefined} 
            trendLabel="promedio general"
            icon={<TrendingUp className="text-accent" />} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* News & Top Scores */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-white">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
                    <Trophy size={14} className="text-accent" />
                    NOTICIAS DE ASCENSO
                  </div>
                  {topPerformer ? (
                    <>
                      <h3 className="text-2xl font-bold">¡Felicidades al {topPerformer.full_name}!</h3>
                      <p className="text-white/80 max-w-md">
                        Ha logrado el mayor puntaje de aprendizaje esta semana con un impresionante {topPerformer.average_score}% en {topPerformer.exam_count} {topPerformer.exam_count === 1 ? 'actividad' : 'actividades'}.
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-white/60 uppercase">Grado</span>
                          <span className="font-bold">{topPerformer.grade}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-white/60 uppercase">Puntaje</span>
                          <span className="font-bold">{topPerformer.average_score}%</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold">¡Bienvenido, {userName}!</h3>
                      <p className="text-white/80 max-w-md">
                        Completa exámenes y simuladores para aparecer en el ranking de la semana.
                      </p>
                    </>
                  )}
                </div>
                <div className="hidden md:block">
                  <img 
                     src="/felicidades.png.jpeg" 
                     alt="Felicidades" 
                     className="w-32 h-32 object-cover rounded-lg shadow-lg"
                   />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-serif">Ranking por Grados</h3>
                <div className="w-64 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    placeholder="Buscar oficial..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <DataTable 
                columns={columns} 
                data={filteredRanking} 
                searchable={false}
              />
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zona de Estudio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 cursor-pointer transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Leyes y Artículos</div>
                    <div className="text-xs text-muted-foreground">Repaso rápido</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 cursor-pointer transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Target size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Preguntas Falladas</div>
                    <div className="text-xs text-muted-foreground">Refuerza tus errores</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={20} className="text-accent" />
                  Progreso de {userName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Temarios Completados</span>
                    <span className="font-bold">{stats?.preguntas_respondidas ?? 0}</span>
                  </div>
                  <div className="h-2 w-full bg-accent/20 rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${Math.min((stats?.preguntas_respondidas ?? 0), 100)}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Simulacros Realizados</span>
                    <span className="font-bold">{stats?.simuladores_realizados ?? 0}</span>
                  </div>
                  <div className="h-2 w-full bg-accent/20 rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${Math.min((stats?.simuladores_realizados ?? 0) * 10, 100)}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Exámenes Aprobados</span>
                    <span className="font-bold">{stats?.examenes_aprobados ?? 0}</span>
                  </div>
                  <div className="h-2 w-full bg-accent/20 rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${Math.min((stats?.examenes_aprobados ?? 0) * 10, 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </Page>
  )
}
