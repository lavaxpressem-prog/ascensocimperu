import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
import { supabase, updatePassword } from '../lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function ResetPasswordPage() {
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const handledEvent = useRef(false)

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted || handledEvent.current) return

        if (event === 'PASSWORD_RECOVERY') {
          handledEvent.current = true
          setTokenValid(true)
          setError(null)
          setIsVerifying(false)
          return
        }

        if (event === 'SIGNED_IN' && session) {
          if (handledEvent.current) return
          handledEvent.current = true
          setTokenValid(true)
          setError(null)
          setIsVerifying(false)
        }
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return

      if (session) {
        if (!handledEvent.current) {
          handledEvent.current = true
          setTokenValid(true)
          setError(null)
          setIsVerifying(false)
        }
      } else {
        if (!handledEvent.current) {
          setError('Enlace de recuperación no válido o expirado. Solicita uno nuevo.')
          setTokenValid(false)
          setIsVerifying(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!newPassword || !confirmPassword) {
      setError('Completa ambos campos de contraseña')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsSubmitting(true)

    try {
      await updatePassword(newPassword)

      toast.success('Contraseña actualizada correctamente')

      setTimeout(() => {
        navigate({ to: '/' })
      }, 2000)
    } catch (err: any) {
      setError(err?.message || 'Error al restablecer contraseña')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isVerifying) {
    return (
      <Page>
        <PageHeader>
          <PageTitle>Verificando...</PageTitle>
        </PageHeader>
        <PageBody>
          <Card className="max-w-md mx-auto">
            <p className="text-center">Verificando token de recuperación...</p>
          </Card>
        </PageBody>
      </Page>
    )
  }

  if (!tokenValid) {
    return (
      <Page>
        <PageHeader>
          <PageTitle>Enlace no válido</PageTitle>
        </PageHeader>
        <PageBody>
          <Card className="max-w-md mx-auto">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => navigate({ to: '/' })}>
                Volver al login
              </Button>
            </div>
          </Card>
        </PageBody>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader>
        <PageTitle>Restablecer Contraseña</PageTitle>
        <PageDescription>Ingresa tu nueva contraseña</PageDescription>
      </PageHeader>
      <PageBody>
        <Card className="max-w-md mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mínimo 8 caracteres"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirma tu contraseña"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </Button>
          </form>
        </Card>
      </PageBody>
    </Page>
  )
}
