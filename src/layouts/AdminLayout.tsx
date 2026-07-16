import React, { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  FileText,
  Newspaper,
  Puzzle,
  FolderOpen,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../lib/AuthProvider'
import { useTheme } from '../lib/hooks/useTheme'
import { cn } from '../lib/utils'

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/questions', label: 'Banco de Preguntas', icon: FileText },
  { href: '/admin/news', label: 'Noticias', icon: Newspaper },
  { href: '/admin/modules', label: 'Modulos', icon: Puzzle },
  { href: '/admin/files', label: 'Archivos', icon: FolderOpen },
  { href: '/admin/stats', label: 'Estadisticas', icon: BarChart3 },
  { href: '/admin/settings', label: 'Configuracion', icon: Settings },
  { href: '/admin/security', label: 'Seguridad', icon: Shield },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { logout, profile } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full w-[260px] bg-sidebar border-r border-sidebar-border overflow-hidden">
      <div className="shrink-0 border-b border-sidebar-border px-4 py-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
          <ChevronLeft size={18} />
          <span className="text-sm">Volver</span>
        </Link>
      </div>

      <div className="shrink-0 border-b border-sidebar-border px-6 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Shield size={18} className="text-primary" />
        </div>
        <div>
          <span className="font-bold text-sm text-sidebar-foreground block">Panel Admin</span>
          <span className="text-xs text-sidebar-foreground/50">AscensoCIM Peru</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground'
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-4 space-y-2">
        {profile && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/50 truncate">
            {profile.email}
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground transition-all"
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          )}
          <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground transition-all"
        >
          <LogOut size={18} />
          <span>Cerrar Sesion</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-screen flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <span className="font-bold text-sm">Panel Admin</span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
