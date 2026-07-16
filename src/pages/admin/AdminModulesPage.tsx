import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { Puzzle, ToggleLeft, ToggleRight } from 'lucide-react'
import { getModulesForAdmin, toggleModuleActive, logAdminAction } from '../../lib/supabase'

export function AdminModulesPage() {
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchModules = async () => {
    setLoading(true)
    try { const data = await getModulesForAdmin(); setModules(data) }
    catch { toast.error('Error al cargar modulos') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchModules() }, [])

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleModuleActive(id, !currentActive)
      await logAdminAction('toggle_module', 'module', id, { is_active: !currentActive })
      toast.success(currentActive ? 'Modulo desactivado' : 'Modulo activado')
      fetchModules()
    } catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const moduleDescriptions: Record<string, string> = {
    'Noticias': 'Leyes, resoluciones y noticias del sistema',
    'Banco de Preguntas': 'Preguntas para examenes y simulacros',
    'Audio Preguntas': 'Audio de preguntas para estudio',
    'Practica por Temas': 'Practica por temas especificos',
    'Inteligencia Artificial': 'Asistente de IA para resolver dudas',
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
            <PageDescription>Activar o desactivar modulos del sistema sin eliminarlos</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(m => (
              <Card key={m.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground">{m.name}</h3>
                  <button onClick={() => handleToggle(m.id, m.is_active !== false)} className="shrink-0">
                    {m.is_active !== false ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-400" />}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{moduleDescriptions[m.name] || m.description || 'Sin descripcion'}</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active !== false ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                    {m.is_active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-xs text-muted-foreground">/{m.slug}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </Page>
  )
}
