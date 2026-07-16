import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast, Input } from '@blinkdotnew/ui'
import { Users, Search, Lock, Unlock, UserCheck, UserX } from 'lucide-react'
import { getAllUsers, getPendingUsers, approveUser, rejectUser, suspendUser, toggleUserLock, setUserRole, logAdminAction } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

export function AdminUsersPage() {
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const [pending, all] = await Promise.all([getPendingUsers(), getAllUsers()])
      setPendingUsers(pending)
      setAllUsers(all)
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleApprove = async (userId: string) => {
    try { await approveUser(userId); await logAdminAction('approve_user', 'user', userId); toast.success('Usuario aprobado'); fetchUsers() } catch (err: any) { toast.error(err?.message || 'Error') }
  }
  const handleReject = async (userId: string) => {
    try { await rejectUser(userId); await logAdminAction('reject_user', 'user', userId); toast.success('Usuario rechazado'); fetchUsers() } catch (err: any) { toast.error(err?.message || 'Error') }
  }
  const handleSuspend = async (userId: string) => {
    try { await suspendUser(userId); await logAdminAction('suspend_user', 'user', userId); toast.success('Usuario suspendido'); fetchUsers() } catch (err: any) { toast.error(err?.message || 'Error') }
  }
  const handleLock = async (userId: string) => {
    try { await toggleUserLock(userId, true); await logAdminAction('lock_user', 'user', userId); toast.success('Bloqueado'); fetchUsers() } catch (err: any) { toast.error(err?.message || 'Error') }
  }
  const handleUnlock = async (userId: string) => {
    try { await toggleUserLock(userId, false); await logAdminAction('unlock_user', 'user', userId); toast.success('Desbloqueado'); fetchUsers() } catch (err: any) { toast.error(err?.message || 'Error') }
  }
  const handleRoleChange = async (userId: string, newRole: string) => {
    try { await setUserRole(userId, newRole); await logAdminAction('change_role', 'user', userId, { new_role: newRole }); toast.success('Rol actualizado'); fetchUsers() } catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const statusLabel = (s: string) => ({ pending: 'Pendiente', approved: 'Aprobado', suspended: 'Suspendido', locked: 'Bloqueado' }[s] || s)
  const statusColor = (s: string) => ({ pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', locked: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }[s] || 'bg-gray-100 text-gray-800')

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = !searchQuery || (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.cip || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Users size={24} className="text-primary" />
          <div>
            <PageTitle>Gestion de Usuarios</PageTitle>
            <PageDescription>Administrar cuentas, roles y permisos de usuarios</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {pendingUsers.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Pendientes de Aprobacion ({pendingUsers.length})</h3>
                <div className="space-y-3">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-border bg-background gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{u.name || u.email}</p>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                        {u.cip && <p className="text-sm text-muted-foreground">CIP: {u.cip}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2" onClick={() => handleApprove(u.id)}>Aprobar</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2" onClick={() => handleReject(u.id)}>Rechazar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="text" placeholder="Buscar por nombre, email o CIP..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary">
                  <option value="all">Todos los estados</option>
                  <option value="approved">Aprobados</option>
                  <option value="pending">Pendientes</option>
                  <option value="suspended">Suspendidos</option>
                  <option value="locked">Bloqueados</option>
                </select>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Usuario</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Estado</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Rol</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Registro</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2">
                          <div className="font-medium text-foreground text-sm truncate max-w-[200px]">{u.name || 'Sin nombre'}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email}</div>
                          {u.cip && <div className="text-xs text-muted-foreground">CIP: {u.cip}</div>}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(u.status)}`}>{statusLabel(u.status)}</span>
                        </td>
                        <td className="py-3 px-2">
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground">
                            <option value="user">User</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {u.status === 'approved' && <button onClick={() => handleSuspend(u.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Suspender"><UserX size={14} /></button>}
                            {u.status === 'approved' && <button onClick={() => handleLock(u.id)} className="p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600" title="Bloquear"><Lock size={14} /></button>}
                            {(u.status === 'locked' || u.status === 'suspended') && <button onClick={() => handleUnlock(u.id)} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600" title="Desbloquear"><Unlock size={14} /></button>}
                            {u.status === 'pending' && <button onClick={() => handleApprove(u.id)} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600" title="Aprobar"><UserCheck size={14} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No se encontraron usuarios</p>}
            </Card>
          </>
        )}
      </PageBody>
    </Page>
  )
}
