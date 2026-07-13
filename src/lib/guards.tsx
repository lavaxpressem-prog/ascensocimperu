import { useAuth } from './AuthProvider'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredStatus?: 'approved' | 'pending' | 'suspended' | 'locked'
}

export function ProtectedRoute({ children, requiredStatus = 'approved' }: ProtectedRouteProps) {
  const { authUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!authUser) {
    return null // App.tsx handles redirect to login
  }

  if (requiredStatus === 'approved' && authUser.status === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full p-8 rounded-lg border border-border bg-card">
          <h2 className="text-xl font-semibold text-foreground mb-4">Cuenta en Revisión</h2>
          <p className="text-muted-foreground mb-4">
            Tu cuenta está siendo revisada por un administrador. Recibirás un correo cuando sea aprobada.
          </p>
          <div className="text-sm text-muted-foreground">
            <p>Estado: <span className="font-medium">Pendiente de aprobación</span></p>
          </div>
        </div>
      </div>
    )
  }

  if (authUser.status === 'suspended') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full p-8 rounded-lg border border-border bg-card">
          <h2 className="text-xl font-semibold text-destructive mb-4">Cuenta Suspendida</h2>
          <p className="text-muted-foreground mb-4">
            Tu cuenta ha sido suspendida. Por favor contacta al administrador para más información.
          </p>
          <div className="text-sm text-muted-foreground">
            <p>Estado: <span className="font-medium">Suspendida</span></p>
          </div>
        </div>
      </div>
    )
  }

  if (authUser.status === 'locked') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full p-8 rounded-lg border border-border bg-card">
          <h2 className="text-xl font-semibold text-destructive mb-4">Cuenta Bloqueada</h2>
          <p className="text-muted-foreground mb-4">
            Tu cuenta está bloqueada temporalmente debido a múltiples intentos de inicio de sesión fallidos.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { authUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!authUser) return null

  if (authUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full p-8 rounded-lg border border-border bg-card">
          <h2 className="text-xl font-semibold text-destructive mb-4">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta sección. Solo administradores pueden ver esta página.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
