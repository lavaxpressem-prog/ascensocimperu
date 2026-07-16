import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { Settings, Save } from 'lucide-react'
import { getSystemConfig, updateSystemConfig, logAdminAction } from '../../lib/supabase'

export function AdminSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSystemConfig()
        const map: Record<string, string> = {}
        data.forEach(c => { map[c.config_key] = c.config_value || '' })
        setConfig(map)
      } catch { toast.error('Error al cargar configuracion') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(config)) {
        await updateSystemConfig(key, value)
      }
      await logAdminAction('update_settings', 'system_config')
      toast.success('Configuracion guardada')
    } catch (err: any) { toast.error(err?.message || 'Error al guardar') }
    setSaving(false)
  }

  const updateField = (key: string, value: string) => setConfig(prev => ({ ...prev, [key]: value }))

  const sections = [
    { title: 'General', fields: [
      { key: 'system_name', label: 'Nombre del Sistema', type: 'text' },
      { key: 'footer_text', label: 'Texto del Pie de Pagina', type: 'text' },
    ]},
    { title: 'Contacto', fields: [
      { key: 'whatsapp_number', label: 'Numero de WhatsApp', type: 'text' },
      { key: 'contact_email', label: 'Correo de Contacto', type: 'email' },
    ]},
    { title: 'Modulos', fields: [
      { key: 'enable_registration', label: 'Habilitar Registro', type: 'toggle' },
      { key: 'enable_ai', label: 'Habilitar IA', type: 'toggle' },
      { key: 'enable_audio', label: 'Habilitar Audio', type: 'toggle' },
    ]},
  ]

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-primary" />
            <div>
              <PageTitle>Configuracion del Sistema</PageTitle>
              <PageDescription>Administrar nombre, logo, WhatsApp, correo y enlaces</PageDescription>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={saving || loading}>
            <Save size={16} className="mr-2" />{saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          sections.map(section => (
            <Card key={section.title} className="p-6">
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <div className="space-y-4">
                {section.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{field.label}</label>
                    {field.type === 'toggle' ? (
                      <button onClick={() => updateField(field.key, config[field.key] === 'true' ? 'false' : 'true')} className="flex items-center gap-2">
                        <div className={`w-12 h-6 rounded-full transition-colors relative ${config[field.key] === 'true' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${config[field.key] === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-sm text-muted-foreground">{config[field.key] === 'true' ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    ) : (
                      <input type={field.type} value={config[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </PageBody>
    </Page>
  )
}
