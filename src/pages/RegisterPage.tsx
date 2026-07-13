import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Button,
  Input,
  toast
} from '@blinkdotnew/ui'
import { supabase } from '../lib/supabase'

interface RegisterPageProps {
  onBackToLogin: () => void
}

export function RegisterPage({ onBackToLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [cip, setCip] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Validaciones
    if (!email || !password || !passwordRepeat || !nombres || !apellidoPaterno || !cip) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }

    if (password !== passwordRepeat) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      // Registrarse con Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombres,
            apellido_paterno: apellidoPaterno,
            apellido_materno: apellidoMaterno,
            cip: cip
          }
        }
      })

      if (error) {
        const msg = error.message || 'Error al crear la cuenta'
        if (msg.includes('already') || msg.includes('registrado') || msg.includes('exists')) {
          toast.error('El correo electrónico ya está registrado. Intenta con otro correo.')
        } else {
          toast.error(msg)
        }
        return
      }

      if (!data.user) {
        toast.error('No se pudo crear la cuenta. Intenta de nuevo.')
        return
      }

      toast.success('Su cuenta fue creada correctamente y se encuentra pendiente de aprobación por el administrador.')
      
      setEmail('')
      setPassword('')
      setPasswordRepeat('')
      setNombres('')
      setApellidoPaterno('')
      setApellidoMaterno('')
      setCip('')

      setTimeout(() => {
        onBackToLogin()
      }, 3000)
    } catch (error) {
      toast.error('Error en la conexión')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-6 bg-white border-b">
        <h1 className="text-2xl font-bold text-gray-900">CREAR CUENTA</h1>
        <p className="text-sm text-gray-500">Completa tu información personal</p>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8">
        <Card className="w-full max-w-lg shadow-lg">
          <CardContent className="pt-8 pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Crea una contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50"
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

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Repite contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPasswordRepeat ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    value={passwordRepeat}
                    onChange={(e) => setPasswordRepeat(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordRepeat(!showPasswordRepeat)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPasswordRepeat ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Nombres
                </label>
                <Input
                  type="text"
                  placeholder="Ingresa tus nombres"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Apellido Paterno
                  </label>
                  <Input
                    type="text"
                    placeholder="Paterno"
                    value={apellidoPaterno}
                    onChange={(e) => setApellidoPaterno(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Apellido Materno
                  </label>
                  <Input
                    type="text"
                    placeholder="Materno"
                    value={apellidoMaterno}
                    onChange={(e) => setApellidoMaterno(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  CIP (Carnet de Identidad Policial)
                </label>
                <Input
                  type="text"
                  placeholder="Ingresa tu CIP"
                  value={cip}
                  onChange={(e) => setCip(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>

              <Button 
                type="button"
                onClick={() => window.open('https://wa.me/51900648150', '_blank')}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 rounded-lg transition"
              >
                Enviar por WhatsApp
              </Button>

              <Button 
                type="button"
                onClick={onBackToLogin}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 rounded-lg transition"
              >
                Cancelar
              </Button>

              <div className="text-center pt-4">
                <button 
                  type="button"
                  onClick={onBackToLogin}
                  className="text-green-700 hover:text-green-800 font-medium text-sm"
                >
                  Iniciar Sesión
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
