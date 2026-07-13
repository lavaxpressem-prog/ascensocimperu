export type UserRole = 'admin' | 'user' | 'supervisor'
export type UserStatus = 'pending' | 'approved' | 'suspended' | 'locked'

export interface Profile {
  id: string
  email: string
  name: string | null
  apellido_paterno: string | null
  apellido_materno: string | null
  cip: string | null
  status: UserStatus
  role: UserRole
  login_attempts: number
  locked_until: string | null
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export interface ModuleWithAccess extends Module {
  blocked: boolean
  blocked_reason: string | null
  can_access: boolean
}

export interface Permission {
  id: string
  user_id: string
  module_id: string
  can_access: boolean
  created_at: string
}

export interface BlockedModule {
  id: string
  user_id: string
  module_id: string
  reason: string | null
  blocked_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  name: string | null
}

export interface LoginPayload {
  email: string
  password: string
}
