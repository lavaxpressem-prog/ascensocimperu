import { lazy, Suspense } from 'react'
import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet } from '@tanstack/react-router'
import { DashboardLayout } from './layouts/DashboardLayout'
import { LoginPageSimple } from './pages/LoginPageSimple'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { useAuth } from './lib/AuthProvider'
import { AdminRoute } from './lib/guards'

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const ExamPage = lazy(() => import('./pages/ExamPage').then(m => ({ default: m.ExamPage })))
const IAPage = lazy(() => import('./pages/IAPage').then(m => ({ default: m.IAPage })))
const InfraccionesPage = lazy(() => import('./pages/InfraccionesPage').then(m => ({ default: m.InfraccionesPage })))
const DirectorioPage = lazy(() => import('./pages/DirectorioPage').then(m => ({ default: m.DirectorioPage })))
const TemariosPage = lazy(() => import('./pages/TemariosPage').then(m => ({ default: m.TemariosPage })))
const AudioPage = lazy(() => import('./pages/AudioPage').then(m => ({ default: m.AudioPage })))
const MapaPage = lazy(() => import('./pages/MapaPage').then(m => ({ default: m.MapaPage })))
const AyudaPage = lazy(() => import('./pages/AyudaPage').then(m => ({ default: m.AyudaPage })))
const PracticaPage = lazy(() => import('./pages/PracticaPage').then(m => ({ default: m.PracticaPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const PapeletasAtuPage = lazy(() => import('./pages/PapeletasAtuPage').then(m => ({ default: m.PapeletasAtuPage })))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}

const rootRoute = createRootRoute({
  component: () => {
    const { user, loading } = useAuth()
    const isResetting = window.location.pathname === '/reset-password'

    if (loading) {
      return <PageLoader />
    }

    if (isResetting) {
      return <Outlet />
    }

    if (!user) {
      return <LoginPageSimple />
    }

    return (
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    )
  }
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Suspense fallback={<PageLoader />}><HomePage /></Suspense>
})

const examRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exam',
  component: () => <Suspense fallback={<PageLoader />}><ExamPage /></Suspense>
})

const iaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ia',
  component: () => <Suspense fallback={<PageLoader />}><IAPage /></Suspense>
})

const infraccionesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/infracciones',
  component: () => <Suspense fallback={<PageLoader />}><InfraccionesPage /></Suspense>
})

const directorioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/directorio',
  component: () => <Suspense fallback={<PageLoader />}><DirectorioPage /></Suspense>
})

const temariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/temarios',
  component: () => <Suspense fallback={<PageLoader />}><TemariosPage /></Suspense>
})

const audioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audio',
  component: () => <Suspense fallback={<PageLoader />}><AudioPage /></Suspense>
})

const mapaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mapa',
  component: () => <Suspense fallback={<PageLoader />}><MapaPage /></Suspense>
})

const ayudaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ayuda',
  component: () => <Suspense fallback={<PageLoader />}><AyudaPage /></Suspense>
})

const practicaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practica',
  component: () => <Suspense fallback={<PageLoader />}><PracticaPage /></Suspense>
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-users',
  component: () => (
    <AdminRoute>
      <Suspense fallback={<PageLoader />}>
        <AdminUsersPage />
      </Suspense>
    </AdminRoute>
  )
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage
})

const papeletasAtuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/papeletas-atu',
  component: () => <Suspense fallback={<PageLoader />}><PapeletasAtuPage /></Suspense>
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  examRoute,
  iaRoute,
  infraccionesRoute,
  directorioRoute,
  temariosRoute,
  audioRoute,
  mapaRoute,
  ayudaRoute,
  practicaRoute,
  adminUsersRoute,
  resetPasswordRoute,
  papeletasAtuRoute
])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return <RouterProvider router={router} />
}
