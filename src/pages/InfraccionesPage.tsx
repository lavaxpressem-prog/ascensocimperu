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

interface InfraccionTransito {
  id: string
  codigo: string
  tipo: string
  categoria: string
  infraccion: string
  calificacion: string
  created_at: string
}

export function InfraccionesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchQueryDisciplina, setSearchQueryDisciplina] = useState('')

  const [transito, setTransito] = useState<InfraccionTransito[]>([])
  const [loadingTransito, setLoadingTransito] = useState(true)
  const [errorTransito, setErrorTransito] = useState<string | null>(null)

  const [disciplinarias, setDisciplinarias] = useState<InfraccionDisciplinaria[]>([])
  const [loadingDisciplina, setLoadingDisciplina] = useState(true)
  const [errorDisciplina, setErrorDisciplina] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTransito() {
      try {
        setLoadingTransito(true)
        setErrorTransito(null)
        const { data, error } = await supabase
          .from('reglamento_transito')
          .select('*')
          .order('created_at', { ascending: true })

        if (error) throw error
        setTransito(data ?? [])
      } catch (err: unknown) {
        setErrorTransito(err instanceof Error ? err.message : 'Error al cargar reglamento de tránsito')
      } finally {
        setLoadingTransito(false)
      }
    }
    fetchTransito()
  }, [])

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
      } catch (err: unknown) {
        setErrorDisciplina(err instanceof Error ? err.message : 'Error al cargar infracciones disciplinarias')
      } finally {
        setLoadingDisciplina(false)
      }
    }
    fetchDisciplinarias()
  }, [])

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
      accessorKey: 'sancion', 
      header: 'Sanción',
      cell: ({ row }: any) => <span className="font-semibold text-sm">{row.original.sancion}</span>
    }
  ]

  const filteredTransito = transito.filter(item =>
    item.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.infraccion.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDisciplina = disciplinarias.filter(item =>
    item.codigo.toLowerCase().includes(searchQueryDisciplina.toLowerCase()) ||
    item.infraccion.toLowerCase().includes(searchQueryDisciplina.toLowerCase())
  )

  const columnsTransito = [
    { 
      accessorKey: 'codigo', 
      header: 'Código',
      cell: ({ row }: any) => <span className="font-bold">{row.original.codigo}</span>
    },
    { 
      accessorKey: 'calificacion', 
      header: 'Gravedad',
      cell: ({ row }: any) => (
        <Badge variant={
          row.original.calificacion === 'Muy Grave' ? 'destructive' :
          row.original.calificacion === 'Grave' ? 'default' :
          'secondary'
        }>
          {row.original.calificacion}
        </Badge>
      )
    },
    { 
      accessorKey: 'infraccion', 
      header: 'Descripción',
      cell: ({ row }: any) => <span className="text-sm">{row.original.infraccion}</span>
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
            
            {loadingTransito ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Cargando infracciones...
              </div>
            ) : errorTransito ? (
              <div className="flex items-center justify-center py-12 text-destructive text-sm">
                {errorTransito}
              </div>
            ) : (
              <DataTable 
                columns={columnsTransito} 
                data={filteredTransito} 
                searchable={false}
              />
            )}
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
