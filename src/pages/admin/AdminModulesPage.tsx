import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { Puzzle, ToggleLeft, ToggleRight } from 'lucide-react'
import { getModulesForAdmin, toggleModuleActive, logAdminAction } from '../../lib/supabase'

export function AdminModulesPage() {
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchModules = async () => {
    setLoading(true)
    try { const data = await getModulesForAdmin(); setModules(data) }
    catch { toast.error('Error al cargar modulos') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchModules() }, [])

  const handleToggle = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive
    const action = newActive ? 'activar' : 'bloquear'
    if (!confirm(`Deseas ${action} este modulo?`)) return

    setTogglingId(id)
    try {
      await toggleModuleActive(id, newActive)
      await logAdminAction('toggle_module', 'module', id, { is_active: newActive })
      toast.success(newActive ? 'Modulo activado' : 'Modulo bloqueado')
      setModules(prev => prev.map(m => m.id === id ? { ...m, is_active: newActive } : m))
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar el modulo')
    } finally {
      setTogglingId(null)
    }
  }

  const moduleDescriptions: Record<string, string> = {
    'Noticias': 'Leyes, resoluciones y noticias del sistema',
    'Banco de Preguntas': 'Preguntas para examenes y simulacros',
    'Audio Preguntas': 'Audio de preguntas para estudio',
    'Practica por Temas': 'Practica por temas especificos',
    'Permutantes': 'Publicación y búsqueda de permutas entre unidades',
    'Tabla Infracciones': 'Tabla de infracciones PNP',
    'Directorio Telefonico': 'Directorio de contactos',
    'Mapa Jurisdiccional': 'Mapa de jurisdicciones',
    'Buscar Papeletas ATU': 'Busqueda de papeletas ATU',
    'Usuarios': 'Gestion de usuarios del sistema',
    'Ayuda': 'Centro de ayuda',
  }

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Puzzle size={24} className="text-primary" />
          <div>
            <PageTitle>Gestion de Modulos</PageTitle>
            <PageDescription>Activar o bloquear modulos del sistema</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(m => {
              const isActive = m.is_active !== false
              const isProcessing = togglingId === m.id
              return (
                <Card key={m.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{m.name}</h3>
                    <button
                      onClick={() => handleToggle(m.id, isActive)}
                      disabled={isProcessing}
                      className="shrink-0 disabled:opacity-50"
                      title={isActive ? 'Bloquear modulo' : 'Activar modulo'}
                    >
                      {isActive ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{moduleDescriptions[m.name] || m.description || 'Sin descripcion'}</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                      {isActive ? 'Activo' : 'Bloqueado'}
                    </span>
                    <span className="text-xs text-muted-foreground">/{m.slug}</span>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant={isActive ? 'outline' : 'default'}
                      size="sm"
                      className="w-full"
                      disabled={isProcessing}
                      onClick={() => handleToggle(m.id, isActive)}
                    >
                      {isProcessing ? 'Procesando...' : isActive ? 'Bloquear' : 'Activar'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageBody>
    </Page>
  )
}
