import React, { useState, useEffect } from 'react'
import {
  Page,
  PageHeader,
  PageTitle,
  PageDescription,
  PageBody,
  Card,
  Button,
  toast
} from '@blinkdotnew/ui'
import { supabase, getAllUsers, getPendingUsers, approveUser, rejectUser, suspendUser } from '../lib/supabase'
import type { Profile } from '../lib/types'

export function AdminUsersPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [cip, setCip] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [fetchUsersError, setFetchUsersError] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoadingUsers(true)
    setFetchUsersError(null)
    try {
      const [pending, all] = await Promise.all([getPendingUsers(), getAllUsers()])
      setPendingUsers(pending)
      setAllUsers(all)
    } catch (err: any) {
      setFetchUsersError(err?.message || 'Error al cargar usuarios')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId)
      toast.success('Usuario aprobado')
      fetchUsers()
    } catch (err: any) {
      toast.error(err?.message || 'Error al aprobar')
    }
  }

  const handleReject = async (userId: string) => {
    try {
      await rejectUser(userId)
      toast.success('Usuario rechazado')
      fetchUsers()
    } catch (err: any) {
      toast.error(err?.message || 'Error al rechazar')
    }
  }

  const handleSuspend = async (userId: string) => {
    try {
      await suspendUser(userId)
      toast.success('Usuario suspendido')
      fetchUsers()
    } catch (err: any) {
      toast.error(err?.message || 'Error al suspender')
    }
  }

  const handleCreateUser = async () => {
    setError(null)
    setMessage(null)

    if (!email.trim() || !password || !passwordConfirm) {
      setError('Completa correo y contraseña.')
      return
    }

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: nombres,
            apellido_paterno: apellidoPaterno,
            apellido_materno: apellidoMaterno,
            cip: cip,
          }
        }
      })

      if (signUpError) throw new Error(signUpError.message)

      if (!data.user) {
        throw new Error('No se pudo crear el usuario.')
      }

      setMessage('Usuario creado correctamente. Puede iniciar sesión con sus datos.')
      toast.success('Usuario registrado')
      setEmail('')
      setPassword('')
      setPasswordConfirm('')
      setNombres('')
      setApellidoPaterno('')
      setApellidoMaterno('')
      setCip('')
      fetchUsers()
    } catch (err: any) {
      setError(err?.message || 'No fue posible crear el usuario.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusLabel = (s: string) => {
    if (s === 'pending') return 'Pendiente'
    if (s === 'approved') return 'Aprobado'
    if (s === 'suspended') return 'Suspendido'
    if (s === 'locked') return 'Bloqueado'
    return s
  }

  const statusColor = (s: string) => {
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800'
    if (s === 'approved') return 'bg-green-100 text-green-800'
    if (s === 'suspended') return 'bg-red-100 text-red-800'
    if (s === 'locked') return 'bg-gray-100 text-gray-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <Page>
      <PageHeader>
        <PageTitle>Gestión de Usuarios</PageTitle>
        <PageDescription>Administrar cuentas de usuario del sistema.</PageDescription>
      </PageHeader>
      <PageBody className="py-12 space-y-8">
        {/* Error al cargar usuarios */}
        {fetchUsersError && (
          <Card className="max-w-4xl w-full p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-destructive">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-destructive">Error al cargar usuarios</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{fetchUsersError}</p>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-white text-sm px-4 py-2"
              onClick={fetchUsers}
            >
              Reintentar
            </Button>
          </Card>
        )}

        {/* Sección: Usuarios Pendientes */}
        {!loadingUsers && pendingUsers.length > 0 && (
          <Card className="max-w-4xl w-full p-8">
            <h3 className="text-lg font-semibold mb-4">Usuarios Pendientes de Aprobación</h3>
            <div className="space-y-3">
              {pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{u.name || u.email}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.cip && <p className="text-sm text-muted-foreground">CIP: {u.cip}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
                      onClick={() => handleApprove(u.id)}
                    >
                      Aprobar
                    </Button>
                    <Button
                      type="button"
                      className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
                      onClick={() => handleReject(u.id)}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Formulario de crear usuario */}
        <Card className="max-w-4xl w-full p-8">
          <h3 className="text-lg font-semibold mb-4">Registrar nuevo usuario</h3>
          <p className="text-sm text-muted-foreground mb-6">Ingresa el correo y contraseña para crear un usuario único.</p>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Contraseña segura"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Repetir contraseña</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Repite la contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPasswordConfirm ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Nombres</label>
                <input
                  type="text"
                  value={nombres}
                  onChange={(event) => setNombres(event.target.value)}
                  className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Nombres"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Apellido Paterno</label>
                  <input
                    type="text"
                    value={apellidoPaterno}
                    onChange={(event) => setApellidoPaterno(event.target.value)}
                    className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Apellido Paterno"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Apellido Materno</label>
                  <input
                    type="text"
                    value={apellidoMaterno}
                    onChange={(event) => setApellidoMaterno(event.target.value)}
                    className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Apellido Materno"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">CIP</label>
                <input
                  type="text"
                  value={cip}
                  onChange={(event) => setCip(event.target.value)}
                  className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Carnet de Identidad Policial"
                />
              </div>
            </div>
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-secondary">
                {message}
              </div>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={isSubmitting}
              onClick={handleCreateUser}
            >
              {isSubmitting ? 'Creando usuario...' : 'Crear usuario'}
            </Button>
          </div>
        </Card>

        {/* Sección: Todos los Usuarios */}
        {!loadingUsers && allUsers.length > 0 && (
          <Card className="max-w-4xl w-full p-8">
            <h3 className="text-lg font-semibold mb-4">Todos los Usuarios ({allUsers.length})</h3>
            <div className="space-y-3">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-foreground truncate">{u.name || u.email}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(u.status)}`}>
                        {statusLabel(u.status)}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {u.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {u.status === 'approved' && (
                      <Button
                        type="button"
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
                        onClick={() => handleSuspend(u.id)}
                      >
                        Suspender
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </PageBody>
    </Page>
  )
}
