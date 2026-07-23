import React, { useState } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { UserPlus } from 'lucide-react'
import { getCurrentSession, logAdminAction } from '../../lib/supabase'

export function AdminRegisterPage() {
  const [nombre, setNombre] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('user')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!nombre.trim()) newErrors.nombre = 'El nombre es obligatorio'
    if (!apellidoPaterno.trim()) newErrors.apellidoPaterno = 'El apellido paterno es obligatorio'
    if (!email.trim()) {
      newErrors.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Formato de email invalido'
    }
    if (!password) {
      newErrors.password = 'La contrasena es obligatoria'
    } else if (password.length < 6) {
      newErrors.password = 'Minimo 6 caracteres'
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contrasenas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const { data: sessionData } = await getCurrentSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        toast.error('Sesion no valida')
        return
      }

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          nombre: nombre.trim(),
          apellidoPaterno: apellidoPaterno.trim(),
          apellidoMaterno: apellidoMaterno.trim(),
          role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al registrar usuario')
        return
      }

      await logAdminAction('create_user', 'user', data.user?.id, { email, role })
      toast.success('Usuario registrado correctamente')

      setNombre('')
      setApellidoPaterno('')
      setApellidoMaterno('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('user')
      setErrors({})
    } catch {
      toast.error('Error de conexion')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2 rounded-lg border bg-background text-foreground outline-none transition-colors ${
      errors[field] ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
    }`

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <UserPlus size={24} className="text-primary" />
          <div>
            <PageTitle>Registro de Usuario</PageTitle>
            <PageDescription>Crear una nueva cuenta de usuario en el sistema</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        <Card className="max-w-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Nombre *</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className={inputClass('nombre')} placeholder="Juan" />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Apellido Paterno *</label>
                <input type="text" value={apellidoPaterno} onChange={e => setApellidoPaterno(e.target.value)} className={inputClass('apellidoPaterno')} placeholder="Perez" />
                {errors.apellidoPaterno && <p className="text-xs text-red-500 mt-1">{errors.apellidoPaterno}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Apellido Materno</label>
                <input type="text" value={apellidoMaterno} onChange={e => setApellidoMaterno(e.target.value)} className={inputClass('apellidoMaterno')} placeholder="Lopez" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Rol</label>
                <select value={role} onChange={e => setRole(e.target.value)} className={inputClass('role')}>
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass('email')} placeholder="correo@ejemplo.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Contrasena *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass('password')} placeholder="Minimo 6 caracteres" />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Confirmar Contrasena *</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass('confirmPassword')} placeholder="Repetir contrasena" />
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={submitting}>
                <UserPlus size={16} className="mr-2" />
                {submitting ? 'Registrando...' : 'Registrar Usuario'}
              </Button>
            </div>
          </form>
        </Card>
      </PageBody>
    </Page>
  )
}
