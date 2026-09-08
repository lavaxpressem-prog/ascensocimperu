import React, { useState, useEffect, useCallback } from 'react'
import {
  Page,
  PageHeader,
  PageTitle,
  PageDescription,
  PageBody,
  Card,
  Input,
  Button,
  Badge,
  toast
} from '@blinkdotnew/ui'
import {
  ArrowRightLeft,
  Plus,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  X,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { useAuth } from '../lib/AuthProvider'
import {
  getPermutasDisponibles,
  getMyPermutas,
  createPermuta,
  updatePermuta,
  deletePermuta,
  togglePermutaEstado,
  type Permuta
} from '../lib/supabase'

type TabType = 'disponibles' | 'mis_permutas'

export function PermutantesPage() {
  const { authUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('disponibles')
  const [permutas, setPermutas] = useState<Permuta[]>([])
  const [misPermutas, setMisPermutas] = useState<Permuta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    unidad_origen: '',
    unidad_destino: '',
    solo_disponibles: true
  })

  // Form state
  const [formData, setFormData] = useState({
    unidad_origen: '',
    unidad_destino: '',
    telefono: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchPermutas = useCallback(async () => {
    setLoading(true)
    try {
      const [disponibles, propias] = await Promise.all([
        getPermutasDisponibles(),
        getMyPermutas()
      ])
      setPermutas(disponibles)
      setMisPermutas(propias)
    } catch {
      toast.error('Error al cargar las permutas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermutas()
  }, [fetchPermutas])

  const resetForm = () => {
    setFormData({ unidad_origen: '', unidad_destino: '', telefono: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.unidad_origen.trim() || !formData.unidad_destino.trim() || !formData.telefono.trim()) {
      toast.error('Todos los campos son obligatorios')
      return
    }

    if (formData.unidad_origen.trim().toUpperCase() === formData.unidad_destino.trim().toUpperCase()) {
      toast.error('La unidad de origen y destino no pueden ser iguales')
      return
    }

    if (!/^\d{7,15}$/.test(formData.telefono.replace(/\D/g, ''))) {
      toast.error('Ingrese un número de teléfono válido (7-15 dígitos)')
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await updatePermuta(editingId, {
          unidad_origen: formData.unidad_origen.trim(),
          unidad_destino: formData.unidad_destino.trim(),
          telefono: formData.telefono.trim()
        })
        toast.success('Permuta actualizada correctamente')
      } else {
        await createPermuta({
          unidad_origen: formData.unidad_origen.trim(),
          unidad_destino: formData.unidad_destino.trim(),
          telefono: formData.telefono.trim()
        })
        toast.success('Permuta publicada correctamente')
      }
      resetForm()
      fetchPermutas()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la permuta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (permuta: Permuta) => {
    setFormData({
      unidad_origen: permuta.unidad_origen,
      unidad_destino: permuta.unidad_destino,
      telefono: permuta.telefono
    })
    setEditingId(permuta.id)
    setShowForm(true)
  }

  const handleToggleEstado = async (id: string, currentEstado: 'DISPONIBLE' | 'NO_DISPONIBLE') => {
    try {
      await togglePermutaEstado(id, currentEstado)
      toast.success(currentEstado === 'DISPONIBLE' ? 'Marcada como no disponible' : 'Marcada como disponible')
      fetchPermutas()
    } catch {
      toast.error('Error al cambiar el estado')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta publicación?')) return
    try {
      await deletePermuta(id)
      toast.success('Publicación eliminada')
      fetchPermutas()
    } catch {
      toast.error('Error al eliminar la publicación')
    }
  }

  const handleContactar = (telefono: string) => {
    const cleanPhone = telefono.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/51${cleanPhone}`
    window.open(whatsappUrl, '_blank')
  }

  const filteredPermutas = permutas.filter(p => {
    if (filters.solo_disponibles && p.estado !== 'DISPONIBLE') return false
    if (filters.unidad_origen && !p.unidad_origen.toLowerCase().includes(filters.unidad_origen.toLowerCase())) return false
    if (filters.unidad_destino && !p.unidad_destino.toLowerCase().includes(filters.unidad_destino.toLowerCase())) return false
    return true
  })

  const renderPermutaCard = (permuta: Permuta, isOwner: boolean = false) => (
    <Card key={permuta.id} className="p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <Badge
            variant={permuta.estado === 'DISPONIBLE' ? 'default' : 'secondary'}
            className={permuta.estado === 'DISPONIBLE'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }
          >
            {permuta.estado === 'DISPONIBLE' ? 'DISPONIBLE' : 'NO DISPONIBLE'}
          </Badge>
          {isOwner && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEdit(permuta)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Editar"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleToggleEstado(permuta.id, permuta.estado)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title={permuta.estado === 'DISPONIBLE' ? 'Marcar no disponible' : 'Marcar disponible'}
              >
                {permuta.estado === 'DISPONIBLE' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              <button
                onClick={() => handleDelete(permuta.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Unidad de Origen</p>
              <p className="text-sm font-medium">{permuta.unidad_origen}</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRightLeft size={16} className="text-muted-foreground" />
          </div>

          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Unidad de Destino</p>
              <p className="text-sm font-medium">{permuta.unidad_destino}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Phone size={14} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{permuta.telefono}</span>
        </div>

        {permuta.estado === 'DISPONIBLE' && (
          <Button
            variant="default"
            size="sm"
            className="w-full gap-2"
            onClick={() => handleContactar(permuta.telefono)}
          >
            <ExternalLink size={14} />
            Contactar
          </Button>
        )}
      </div>
    </Card>
  )

  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className="w-fit gap-1">
            <ArrowRightLeft size={12} className="text-accent" />
            PERMUTAS
          </Badge>
          <PageTitle className="font-serif">Permutantes</PageTitle>
          <PageDescription>Encuentra o publica una oportunidad de permuta entre unidades.</PageDescription>
        </div>
      </PageHeader>

      <PageBody className="p-4 md:p-8">
        {/* Tabs y Botón de acción */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'disponibles' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('disponibles')}
            >
              Permutas Disponibles
            </Button>
            <Button
              variant={activeTab === 'mis_permutas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('mis_permutas')}
            >
              Mis Permutas
            </Button>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : '+ Publicar permuta'}
          </Button>
        </div>

        {/* Formulario */}
        {showForm && (
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">
              {editingId ? 'Editar Permuta' : 'Nueva Publicación de Permuta'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Unidad de Origen *</label>
                  <Input
                    placeholder="Ej: COMISARÍA SAN MIGUEL"
                    value={formData.unidad_origen}
                    onChange={(e) => setFormData(prev => ({ ...prev, unidad_origen: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Unidad de Destino *</label>
                  <Input
                    placeholder="Ej: COMISARÍA MIRAFLORES"
                    value={formData.unidad_destino}
                    onChange={(e) => setFormData(prev => ({ ...prev, unidad_destino: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Teléfono *</label>
                  <Input
                    placeholder="Ej: 987654321"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    {submitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : editingId ? (
                      <Edit2 size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Publicar'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        )}

        {/* Filtros (solo en tab disponibles) */}
        {activeTab === 'disponibles' && (
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unidad de Origen</label>
                <Input
                  placeholder="Buscar por origen..."
                  value={filters.unidad_origen}
                  onChange={(e) => setFilters(prev => ({ ...prev, unidad_origen: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unidad de Destino</label>
                <Input
                  placeholder="Buscar por destino..."
                  value={filters.unidad_destino}
                  onChange={(e) => setFilters(prev => ({ ...prev, unidad_destino: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setFilters({ unidad_origen: '', unidad_destino: '', solo_disponibles: true })}
                >
                  <X size={14} />
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : activeTab === 'disponibles' ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Permutas Disponibles</h2>
              <p className="text-sm text-muted-foreground">
                {filteredPermutas.length} publicación{filteredPermutas.length !== 1 ? 'es' : ''} encontrada{filteredPermutas.length !== 1 ? 's' : ''}
              </p>
            </div>
            {filteredPermutas.length === 0 ? (
              <Card className="p-12 text-center">
                <ArrowRightLeft size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No hay permutas disponibles</h3>
                <p className="text-muted-foreground mb-4">
                  Sé el primero en publicar una oportunidad de permuta.
                </p>
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus size={16} />
                  Publicar permuta
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPermutas.map(permuta => renderPermutaCard(permuta, false))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Mis Permutas</h2>
              <p className="text-sm text-muted-foreground">
                {misPermutas.length} publicación{misPermutas.length !== 1 ? 'es' : ''} total
              </p>
            </div>
            {misPermutas.length === 0 ? (
              <Card className="p-12 text-center">
                <ArrowRightLeft size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No tienes publicaciones</h3>
                <p className="text-muted-foreground mb-4">
                  Crea tu primera publicación de permuta para encontrar un intercambio.
                </p>
                <Button onClick={() => { setShowForm(true); setActiveTab('disponibles') }} className="gap-2">
                  <Plus size={16} />
                  Publicar permuta
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {misPermutas.map(permuta => renderPermutaCard(permuta, true))}
              </div>
            )}
          </>
        )}
      </PageBody>
    </Page>
  )
}
