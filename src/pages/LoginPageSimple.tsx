import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Button,
  Input,
  toast
} from '@blinkdotnew/ui'
import { RegisterPage } from './RegisterPage'
import { useAuth } from '../lib/AuthProvider'

export function LoginPageSimple() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login, resetPassword } = useAuth()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setIsSubmitting(true)

    try {
      await login(email, password)
      toast.success('¡Bienvenido!')
      window.location.reload()
    } catch (err: any) {
      setSubmitError(err.message || 'Error al iniciar sesión')
      toast.error(err.message || 'Error al iniciar sesión')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error('Ingresa tu correo electrónico')
      return
    }
    setIsSubmitting(true)
    try {
      await resetPassword(resetEmail.trim())
      setResetSent(true)
      toast.success('Revisa tu correo electrónico')
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar enlace')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showRegister) {
    return <RegisterPage onBackToLogin={() => setShowRegister(false)} />
  }

  if (showReset) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-between items-center px-8 py-6 bg-white border-b">
          <h1 className="text-2xl font-bold text-gray-900">RECUPERAR CONTRASEÑA</h1>
          <p className="text-sm text-gray-500">Ingresa tu correo para recibir el enlace</p>
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)] px-4">
          <Card className="w-full max-w-lg shadow-lg">
            <CardContent className="pt-12 pb-12 px-12">
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center shadow-lg">
                  <img
                    src="/logo-portada.jpeg"
                    alt="Logo"
                    className="w-20 h-20 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <h2 className="text-xl font-semibold text-gray-400">AscensoCIM Perú</h2>
              </div>

              {resetSent ? (
                <div className="text-center space-y-4">
                  <p className="text-gray-600">
                    Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.
                  </p>
                  <Button
                    type="button"
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg"
                    onClick={() => { setShowReset(false); setResetSent(false) }}
                  >
                    Volver al inicio
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-3">
                      Correo electrónico
                    </label>
                    <Input
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-gray-50"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition"
                    onClick={handleResetPassword}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
                  </Button>
                  <div className="text-center pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowReset(false)}
                      className="text-green-700 hover:text-green-800 font-medium text-sm"
                    >
                      Volver al inicio de sesión
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center px-8 py-6 bg-white border-b">
        <h1 className="text-2xl font-bold text-gray-900">BIENVENIDO</h1>
        <p className="text-sm text-gray-500">Accede con tu correo electrónico para continuar</p>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] px-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardContent className="pt-12 pb-12 px-12">
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center shadow-lg">
                <img
                  src="/logo-portada.jpeg"
                  alt="Logo"
                  className="w-20 h-20 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <h2 className="text-xl font-semibold text-gray-400">AscensoCIM Perú</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                  {submitError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-3">
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-3">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition"
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>

              <div className="flex justify-between items-center pt-4 border-t text-sm">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-green-700 hover:text-green-800 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="text-green-700 hover:text-green-800 font-medium"
                >
                  Regístrate aquí
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
