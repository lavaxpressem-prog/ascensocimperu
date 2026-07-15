import React, { useState, useEffect } from 'react'
import { 
  Page, 
  PageHeader, 
  PageTitle, 
  PageDescription, 
  PageBody, 
  DataTable, 
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input
} from '@blinkdotnew/ui'
import { AlertTriangle, Info, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface InfraccionDisciplinaria {
  id: number
  codigo: string
  gravedad: string
  infraccion: string
  medida_preventiva: string
  sancion: string
}

export function InfraccionesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchQueryDisciplina, setSearchQueryDisciplina] = useState('')

  const [disciplinarias, setDisciplinarias] = useState<InfraccionDisciplinaria[]>([])
  const [loadingDisciplina, setLoadingDisciplina] = useState(true)
  const [errorDisciplina, setErrorDisciplina] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDisciplinarias() {
      try {
        setLoadingDisciplina(true)
        setErrorDisciplina(null)
        const { data, error } = await supabase
          .from('infracciones_pnp')
          .select('*')
          .order('created_at', { ascending: true })

        if (error) throw error
        setDisciplinarias(data ?? [])
      } catch (err: any) {
        setErrorDisciplina(err.message ?? 'Error al cargar infracciones disciplinarias')
      } finally {
        setLoadingDisciplina(false)
      }
    }
    fetchDisciplinarias()
  }, [])

  const mockInfracciones = [
    { id: '1', code: 'G01', severity: 'Grave', description: 'No respetar la luz roja del semáforo.', fine: 396.00, points: 20 },
    { id: '2', code: 'M01', severity: 'Muy Grave', description: 'Conducir con presencia de alcohol en la sangre.', fine: 2475.00, points: 100 },
    { id: '3', code: 'L01', severity: 'Leve', description: 'Estacionar en lugar prohibido.', fine: 198.00, points: 5 },
  ]

  const columnsDisciplina = [
    { 
      accessorKey: 'codigo', 
      header: 'Código',
      cell: ({ row }: any) => <span className="font-bold">{row.original.codigo}</span>
    },
    { 
      accessorKey: 'gravedad', 
      header: 'Gravedad',
      cell: ({ row }: any) => (
        <Badge variant={
          row.original.gravedad === 'Muy Grave' ? 'destructive' :
          row.original.gravedad === 'Grave' ? 'default' :
          'secondary'
        }>
          {row.original.gravedad}
        </Badge>
      )
    },
    { 
      accessorKey: 'infraccion', 
      header: 'Descripción',
      cell: ({ row }: any) => <span className="text-sm">{row.original.infraccion}</span>
    },
    { 
      accessorKey: 'medida_preventiva', 
      header: 'Medida Preventiva',
      cell: ({ row }: any) => <span className="text-sm">{row.original.medida_preventiva}</span>
    },
    { 
      accessorKey: 'sancion', 
      header: 'Sanción',
      cell: ({ row }: any) => <span className="font-semibold text-sm">{row.original.sancion}</span>
    }
  ]

  const filteredInfracciones = mockInfracciones.filter(item =>
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDisciplina = disciplinarias.filter(item =>
    item.codigo.toLowerCase().includes(searchQueryDisciplina.toLowerCase()) ||
    item.infraccion.toLowerCase().includes(searchQueryDisciplina.toLowerCase())
  )

  const columns = [
    { 
      accessorKey: 'code', 
      header: 'Código',
      cell: ({ row }: any) => <span className="font-bold">{row.original.code}</span>
    },
    { 
      accessorKey: 'severity', 
      header: 'Gravedad',
      cell: ({ row }: any) => (
        <Badge variant={
          row.original.severity === 'Muy Grave' ? 'destructive' :
          row.original.severity === 'Grave' ? 'default' :
          'secondary'
        }>
          {row.original.severity}
        </Badge>
      )
    },
    { 
      accessorKey: 'description', 
      header: 'Descripción',
      cell: ({ row }: any) => <span className="text-sm">{row.original.description}</span>
    },
    { 
      accessorKey: 'fine', 
      header: 'Multa (S/)',
      cell: ({ row }: any) => <span className="font-mono">S/ {row.original.fine.toFixed(2)}</span>
    },
    { 
      accessorKey: 'points', 
      header: 'Puntos',
      cell: ({ row }: any) => <span className="font-bold text-center">{row.original.points}</span>
    }
  ]

  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit gap-1 text-primary">
            <Info size={12} />
            Ley 30714 / Reg. Tránsito
          </Badge>
          <PageTitle className="font-serif">Tabla de Infracciones</PageTitle>
          <PageDescription>Consulta rápida de infracciones, sanciones y medidas preventivas</PageDescription>
        </div>
      </PageHeader>
      
      <PageBody className="space-y-6">
        <Tabs defaultValue="transito">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="transito">Reglamento de Tránsito</TabsTrigger>
            <TabsTrigger value="disciplina">Régimen Disciplinario</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transito" className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="Buscar código o descripción..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle size={14} className="text-accent" />
                Valores basados en la UIT vigente
              </div>
            </div>
            
            <DataTable 
              columns={columns} 
              data={filteredInfracciones} 
              searchable={false}
            />
          </TabsContent>
          
          <TabsContent value="disciplina" className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="Buscar código o descripción..." 
                  value={searchQueryDisciplina}
                  onChange={(e) => setSearchQueryDisciplina(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle size={14} className="text-accent" />
                Ley 30714 - Régimen Disciplinario PNP
              </div>
            </div>
            
            {loadingDisciplina ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Cargando infracciones...
              </div>
            ) : errorDisciplina ? (
              <div className="flex items-center justify-center py-12 text-destructive text-sm">
                {errorDisciplina}
              </div>
            ) : (
              <DataTable 
                columns={columnsDisciplina} 
                data={filteredDisciplina} 
                searchable={false}
              />
            )}
          </TabsContent>
        </Tabs>
      </PageBody>
    </Page>
  )
}
