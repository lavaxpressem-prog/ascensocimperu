import React, { useState, useEffect, useMemo } from 'react'
import { 
  Page, 
  PageHeader, 
  PageTitle, 
  PageDescription, 
  PageBody, 
  Card,
  CardContent,
  Badge,
  Input
} from '@blinkdotnew/ui'
import { Phone, Building2, MapPin, Search } from 'lucide-react'
import { getComisarias, type Comisaria } from '../lib/supabase'

export function DirectorioPage() {
  const [comisarias, setComisarias] = useState<Comisaria[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('Todas')

  useEffect(() => {
    getComisarias().then(data => {
      setComisarias(data)
      setLoading(false)
    })
  }, [])

  const regions = useMemo(() => {
    const unique = [...new Set(comisarias.map(c => c.region).filter(Boolean))]
    return ['Todas', ...unique.sort()]
  }, [comisarias])

  const filtered = useMemo(() => {
    return comisarias.filter(c => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        (c.nombre ?? '').toLowerCase().includes(q) ||
        (c.distrito ?? '').toLowerCase().includes(q) ||
        (c.provincia ?? '').toLowerCase().includes(q) ||
        (c.departamento ?? '').toLowerCase().includes(q) ||
        (c.comando_superior ?? '').toLowerCase().includes(q)
      
      const matchesRegion = selectedRegion === 'Todas' || c.region === selectedRegion
      
      return matchesSearch && matchesRegion
    })
  }, [comisarias, searchQuery, selectedRegion])

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'Sin número'
    return phone.replace(/\s+/g, '')
  }

  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <PageTitle className="font-serif">Prontuario Telefónico</PageTitle>
          <PageDescription>Directorio de celulares por comisarías, DIVOPUS y unidades especializadas</PageDescription>
        </div>
      </PageHeader>
      
      <PageBody className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Buscar por nombre, distrito o jurisdicción..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {regions.map(region => (
              <Badge 
                key={region}
                variant={selectedRegion === region ? 'default' : 'outline'} 
                className={`cursor-pointer transition-colors ${
                  selectedRegion === region 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/5'
                }`}
                onClick={() => setSelectedRegion(region)}
              >
                {region}
              </Badge>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {loading ? 'Cargando directorio...' : `${filtered.length} comisarías encontradas`}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 bg-muted rounded" />
                      <div className="w-20 h-5 bg-muted rounded" />
                    </div>
                    <div className="w-3/4 h-5 bg-muted rounded" />
                    <div className="w-full h-9 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(comisaria => (
              <Card key={comisaria.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2">{comisaria.nombre}</h3>
                          {comisaria.categoria && (
                            <Badge variant="secondary" className="mt-1 text-xs">{comisaria.categoria}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span className="line-clamp-1">
                        {comisaria.distrito}{comisaria.provincia ? `, ${comisaria.provincia}` : ''}
                      </span>
                    </div>

                    {comisaria.direccion && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {comisaria.direccion}
                      </div>
                    )}

                    {comisaria.telefono ? (
                      <a 
                        href={`tel:${formatPhone(comisaria.telefono)}`}
                        className="flex items-center gap-2 p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors group"
                      >
                        <Phone size={16} className="text-primary" />
                        <span className="font-mono font-bold text-primary">{comisaria.telefono}</span>
                        <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Llamar
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-muted-foreground">
                        <Phone size={16} />
                        <span className="text-sm">Sin número registrado</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No se encontraron comisarías</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Intenta con otros términos de búsqueda</p>
          </div>
        )}

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4 text-sm text-primary">
            <Info size={20} />
            <p>
              Este directorio se actualiza periódicamente. Si encuentras algún número desactualizado, por favor repórtalo en la sección de ayuda.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </Page>
  )
}

function Info({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
