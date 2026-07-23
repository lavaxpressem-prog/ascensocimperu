import { lazy, Suspense } from 'react'
import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet, useLocation } from '@tanstack/react-router'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AdminLayout } from './layouts/AdminLayout'
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
const PracticaPreguntasPage = lazy(() => import('./pages/PracticaPreguntasPage').then(m => ({ default: m.PracticaPreguntasPage })))
const PapeletasAtuPage = lazy(() => import('./pages/PapeletasAtuPage').then(m => ({ default: m.PapeletasAtuPage })))

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminRegisterPage = lazy(() => import('./pages/admin/AdminRegisterPage').then(m => ({ default: m.AdminRegisterPage })))
const AdminQuestionsPage = lazy(() => import('./pages/admin/AdminQuestionsPage').then(m => ({ default: m.AdminQuestionsPage })))
const AdminNewsPage = lazy(() => import('./pages/admin/AdminNewsPage').then(m => ({ default: m.AdminNewsPage })))
const AdminModulesPage = lazy(() => import('./pages/admin/AdminModulesPage').then(m => ({ default: m.AdminModulesPage })))
const AdminFilesPage = lazy(() => import('./pages/admin/AdminFilesPage').then(m => ({ default: m.AdminFilesPage })))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })))
const AdminSecurityPage = lazy(() => import('./pages/admin/AdminSecurityPage').then(m => ({ default: m.AdminSecurityPage })))
const AdminStatsPage = lazy(() => import('./pages/admin/AdminStatsPage').then(m => ({ default: m.AdminStatsPage })))

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

function RootComponent() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const isResetting = location.pathname === '/reset-password'
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (loading) {
    return <PageLoader />
  }

  if (isResetting) {
    return <Outlet />
  }

  if (!user) {
    return <LoginPageSimple />
  }

  if (isAdminRoute) {
    return (
      <AdminRoute>
        <AdminLayout>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </AdminLayout>
      </AdminRoute>
    )
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  )
}

const rootRoute = createRootRoute({
  component: RootComponent
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

const practicaPreguntasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practica-de-preguntas',
  component: () => <Suspense fallback={<PageLoader />}><PracticaPreguntasPage /></Suspense>
})

const papeletasAtuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/papeletas-atu',
  component: () => <Suspense fallback={<PageLoader />}><PapeletasAtuPage /></Suspense>
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage
})

// ── Admin Routes ──

const adminIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => <Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense>
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: () => <Suspense fallback={<PageLoader />}><AdminUsersPage /></Suspense>
})

const adminRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/register',
  component: () => <Suspense fallback={<PageLoader />}><AdminRegisterPage /></Suspense>
})

const adminQuestionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/questions',
  component: () => <Suspense fallback={<PageLoader />}><AdminQuestionsPage /></Suspense>
})

const adminNewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/news',
  component: () => <Suspense fallback={<PageLoader />}><AdminNewsPage /></Suspense>
})

const adminModulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/modules',
  component: () => <Suspense fallback={<PageLoader />}><AdminModulesPage /></Suspense>
})

const adminFilesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/files',
  component: () => <Suspense fallback={<PageLoader />}><AdminFilesPage /></Suspense>
})

const adminSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/settings',
  component: () => <Suspense fallback={<PageLoader />}><AdminSettingsPage /></Suspense>
})

const adminSecurityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/security',
  component: () => <Suspense fallback={<PageLoader />}><AdminSecurityPage /></Suspense>
})

const adminStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/stats',
  component: () => <Suspense fallback={<PageLoader />}><AdminStatsPage /></Suspense>
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
  practicaPreguntasRoute,
  papeletasAtuRoute,
  resetPasswordRoute,
  adminIndexRoute,
  adminUsersRoute,
  adminRegisterRoute,
  adminQuestionsRoute,
  adminNewsRoute,
  adminModulesRoute,
  adminFilesRoute,
  adminSettingsRoute,
  adminSecurityRoute,
  adminStatsRoute,
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
