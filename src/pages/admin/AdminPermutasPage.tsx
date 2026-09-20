import React, { useState, useEffect, useCallback } from 'react'
import {
  Page,
  PageHeader,
  PageTitle,
  PageDescription,
  PageBody,
  Card,
  Button,
  toast,
} from '@blinkdotnew/ui'
import {
  ArrowRightLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  ToggleLeft,
  ToggleRight,
  Trash2,
  MapPin,
  Phone,
  Calendar,
  X,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  getAllPermutasForAdmin,
  getPermutasAdminStats,
  adminUpdatePermutaEstado,
  adminDeletePermuta,
  adminCreatePermuta,
  getAllUsers,
  logAdminAction,
} from '../../lib/supabase'
import type { Permuta } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

const PAGE_SIZE = 20

export function AdminPermutasPage() {
  const [permutas, setPermutas] = useState<Permuta[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterOrigen, setFilterOrigen] = useState('')
  const [filterDestino, setFilterDestino] = useState('')
  const [stats, setStats] = useState<{ total: number; disponibles: number; no_disponibles: number; recientes_7d: number } | null>(null)
  const [selectedPermuta, setSelectedPermuta] = useState<Permuta | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [createForm, setCreateForm] = useState({
    userId: '',
    unidad_origen: '',
    unidad_destino: '',
    telefono: '',
  })
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const fetchPermutas = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await getAllPermutasForAdmin({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        estado: filterEstado,
        search: search || undefined,
      })

      let filtered = data
      if (filterOrigen) {
        filtered = filtered.filter(p => p.unidad_origen.toLowerCase().includes(filterOrigen.toLowerCase()))
      }
      if (filterDestino) {
        filtered = filtered.filter(p => p.unidad_destino.toLowerCase().includes(filterDestino.toLowerCase()))
      }

      setPermutas(filtered)
      setTotal(count)
    } catch {
      toast.error('Error al cargar las permutas')
    } finally {
      setLoading(false)
    }
  }, [page, filterEstado, search, filterOrigen, filterDestino])

  const fetchStats = useCallback(async () => {
    try {
      const data = await getPermutasAdminStats()
      setStats(data)
    } catch {
      // Silenciar error de stats
    }
  }, [])

  useEffect(() => {
    fetchPermutas()
  }, [fetchPermutas])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getAllUsers()
      setUsers(data.filter(u => u.status === 'approved'))
    } catch {
      // Silenciar error
    }
  }, [])

  useEffect(() => {
    if (showCreateForm && users.length === 0) {
      fetchUsers()
    }
  }, [showCreateForm, users.length, fetchUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createForm.userId) {
      toast.error('Seleccione un usuario')
      return
    }
    if (!createForm.unidad_origen.trim()) {
      toast.error('Ingrese la unidad de origen')
      return
    }
    if (!createForm.unidad_destino.trim()) {
      toast.error('Ingrese la unidad de destino')
      return
    }
    if (createForm.unidad_origen.trim().toUpperCase() === createForm.unidad_destino.trim().toUpperCase()) {
      toast.error('La unidad de origen y destino no pueden ser iguales')
      return
    }
    if (!createForm.telefono.trim()) {
      toast.error('Ingrese un número de teléfono')
      return
    }
    if (!/^\d{7,15}$/.test(createForm.telefono.replace(/\D/g, ''))) {
      toast.error('Ingrese un número de teléfono válido (7-15 dígitos)')
      return
    }

    setCreateSubmitting(true)
    try {
      await adminCreatePermuta(createForm.userId, {
        unidad_origen: createForm.unidad_origen.trim(),
        unidad_destino: createForm.unidad_destino.trim(),
        telefono: createForm.telefono.trim(),
      })
      await logAdminAction('create_permuta', 'permuta', undefined, {
        target_user_id: createForm.userId,
        unidad_origen: createForm.unidad_origen.trim(),
        unidad_destino: createForm.unidad_destino.trim(),
      })
      toast.success('Permuta creada correctamente')
      setCreateForm({ userId: '', unidad_origen: '', unidad_destino: '', telefono: '' })
      setShowCreateForm(false)
      fetchPermutas()
      fetchStats()
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear la permuta')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleToggleEstado = async (permuta: Permuta) => {
    const newEstado = permuta.estado === 'DISPONIBLE' ? 'NO_DISPONIBLE' : 'DISPONIBLE'
    const confirmMsg = `¿Deseas cambiar esta publicación a ${newEstado}?`
    if (!confirm(confirmMsg)) return

    setActionLoading(true)
    try {
      await adminUpdatePermutaEstado(permuta.id, newEstado)
      await logAdminAction('update_permuta_estado', 'permuta', permuta.id, { nuevo_estado: newEstado })
      toast.success(`Publicación cambiada a ${newEstado}`)
      fetchPermutas()
      fetchStats()
      if (selectedPermuta?.id === permuta.id) {
        setSelectedPermuta({ ...permuta, estado: newEstado })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (permuta: Permuta) => {
    const confirmMsg = 'Esta acción eliminará permanentemente la publicación. ¿Deseas continuar?'
    if (!confirm(confirmMsg)) return

    setActionLoading(true)
    try {
      await adminDeletePermuta(permuta.id)
      await logAdminAction('delete_permuta', 'permuta', permuta.id)
      toast.success('Publicación eliminada')
      setSelectedPermuta(null)
      fetchPermutas()
      fetchStats()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar')
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const statCards = [
    { label: 'Total de permutas', value: stats?.total ?? 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
    { label: 'Disponibles', value: stats?.disponibles ?? 0, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
    { label: 'No disponibles', value: stats?.no_disponibles ?? 0, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
    { label: 'Recientes (7d)', value: stats?.recientes_7d ?? 0, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
  ]

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <ArrowRightLeft size={24} className="text-primary" />
          <div>
            <PageTitle>Gestion de Permutas</PageTitle>
            <PageDescription>Administrar publicaciones de permutas entre unidades</PageDescription>
          </div>
        </div>
      </PageHeader>

      <PageBody className="p-4 md:p-8 space-y-6">
        {loading && permutas.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map(card => (
                <Card key={card.label} className="overflow-hidden">
                  <div className="p-4 md:p-5">
                    <div className={`p-2 rounded-lg ${card.bg} w-fit mb-2`}>
                      <ArrowRightLeft size={16} className={card.color} />
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-foreground">
                      {card.value.toLocaleString()}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1">{card.label}</div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Filters & Search */}
            <Card className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por unidad, telefono..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <select
                  value={filterEstado}
                  onChange={e => { setFilterEstado(e.target.value); setPage(0) }}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary"
                >
                  <option value="all">Todos los estados</option>
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="NO_DISPONIBLE">No disponible</option>
                </select>
                <input
                  type="text"
                  placeholder="Filtrar por origen..."
                  value={filterOrigen}
                  onChange={e => { setFilterOrigen(e.target.value); setPage(0) }}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary w-full md:w-48"
                />
                <input
                  type="text"
                  placeholder="Filtrar por destino..."
                  value={filterDestino}
                  onChange={e => { setFilterDestino(e.target.value); setPage(0) }}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary w-full md:w-48"
                />
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => { setShowCreateForm(!showCreateForm); if (!showCreateForm) fetchUsers() }}
                >
                  {showCreateForm ? <X size={16} /> : <Plus size={16} />}
                  {showCreateForm ? 'Cancelar' : 'Nueva Permuta'}
                </Button>
              </div>
            </Card>

            {/* Create Form */}
            {showCreateForm && (
              <Card className="p-4 md:p-6">
                <h3 className="font-semibold mb-4">Crear Permuta para Usuario</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Usuario *</label>
                      <select
                        value={createForm.userId}
                        onChange={e => setCreateForm(prev => ({ ...prev, userId: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        required
                      >
                        <option value="">Seleccionar usuario...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Telefono *</label>
                      <input
                        type="text"
                        placeholder="Ej: 987654321"
                        value={createForm.telefono}
                        onChange={e => setCreateForm(prev => ({ ...prev, telefono: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Unidad de Origen *</label>
                      <input
                        type="text"
                        placeholder="Ej: COMISARIA SAN MIGUEL"
                        value={createForm.unidad_origen}
                        onChange={e => setCreateForm(prev => ({ ...prev, unidad_origen: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Unidad de Destino *</label>
                      <input
                        type="text"
                        placeholder="Ej: COMISARIA MIRAFLORES"
                        value={createForm.unidad_destino}
                        onChange={e => setCreateForm(prev => ({ ...prev, unidad_destino: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createSubmitting} className="gap-2">
                      {createSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {createSubmitting ? 'Creando...' : 'Crear Permuta'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Usuario</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Unidad Origen</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Unidad Destino</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Telefono</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permutas.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground text-sm truncate max-w-[180px]">
                            {(p as any).profiles?.name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {(p as any).profiles?.email || ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground truncate max-w-[150px]">{p.unidad_origen}</td>
                        <td className="py-3 px-4 text-sm text-foreground truncate max-w-[150px]">{p.unidad_destino}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{p.telefono}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.estado === 'DISPONIBLE'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {p.estado === 'DISPONIBLE' ? 'Disponible' : 'No disponible'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => setSelectedPermuta(p)}
                              className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                              title="Ver detalle"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleEstado(p)}
                              disabled={actionLoading}
                              className="p-1.5 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600"
                              title={p.estado === 'DISPONIBLE' ? 'Marcar no disponible' : 'Marcar disponible'}
                            >
                              {p.estado === 'DISPONIBLE' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              disabled={actionLoading}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {permutas.length === 0 && (
                <div className="text-center py-12">
                  <ArrowRightLeft size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay permutas registradas</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Pagina {page + 1} de {totalPages} ({total} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Detail Modal */}
            {selectedPermuta && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedPermuta(null)} />
                <div className="relative bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">Detalle de Permuta</h3>
                    <button
                      onClick={() => setSelectedPermuta(null)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        selectedPermuta.estado === 'DISPONIBLE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {selectedPermuta.estado === 'DISPONIBLE' ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-secondary">
                          <span className="text-xs font-medium text-muted-foreground">Usuario</span>
                          <p className="text-sm font-medium text-foreground">{(selectedPermuta as any).profiles?.name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{(selectedPermuta as any).profiles?.email || ''}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-muted-foreground mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Unidad de Origen</p>
                          <p className="text-sm font-medium text-foreground">{selectedPermuta.unidad_origen}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-primary mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Unidad de Destino</p>
                          <p className="text-sm font-medium text-foreground">{selectedPermuta.unidad_destino}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone size={16} className="text-muted-foreground mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Telefono</p>
                          <p className="text-sm font-medium text-foreground">{selectedPermuta.telefono}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-muted-foreground mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha de creacion</p>
                          <p className="text-sm text-foreground">
                            {new Date(selectedPermuta.created_at).toLocaleString('es-PE')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-muted-foreground mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Ultima actualizacion</p>
                          <p className="text-sm text-foreground">
                            {new Date(selectedPermuta.updated_at).toLocaleString('es-PE')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleToggleEstado(selectedPermuta)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : selectedPermuta.estado === 'DISPONIBLE' ? (
                          <>
                            <ToggleLeft size={16} className="mr-2" />
                            Marcar No Disponible
                          </>
                        ) : (
                          <>
                            <ToggleRight size={16} className="mr-2" />
                            Marcar Disponible
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(selectedPermuta)}
                        disabled={actionLoading}
                      >
                        <Trash2 size={16} className="mr-2" />
                        Eliminar
                      </Button>
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
