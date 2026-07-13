import { createBrowserClient } from '@supabase/ssr'
import type { Profile, ModuleWithAccess, ActivityLog } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ──

export async function signUp(email: string, password: string, metadata: Record<string, string>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

// ── Profile helpers ──

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

// ── Admin helpers ──

export async function getPendingUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Profile[]
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Profile[]
}

export async function approveUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'approved' })
    .eq('id', userId)
  if (error) throw error
}

export async function rejectUser(userId: string) {
  // Cannot delete auth users from browser client (requires service_role key).
  // Mark as suspended instead so they cannot log in.
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId)
  if (error) throw error
}

export async function suspendUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId)
  if (error) throw error
}

// ── Module helpers ──

export async function getUserModules(userId: string): Promise<ModuleWithAccess[]> {
  const { data, error } = await supabase
    .rpc('get_user_modules', { p_user_id: userId })
  if (error) throw error
  return data as ModuleWithAccess[]
}

export async function checkModuleAccess(userId: string, moduleSlug: string): Promise<boolean> {
  const modules = await getUserModules(userId)
  const mod = modules.find(m => m.slug === moduleSlug)
  if (!mod) return false
  return !mod.blocked && mod.can_access
}

export async function blockModule(userId: string, moduleId: string, reason?: string) {
  const { error } = await supabase
    .from('blocked_modules')
    .upsert({ user_id: userId, module_id: moduleId, reason })
  if (error) throw error
}

export async function unblockModule(userId: string, moduleId: string) {
  const { error } = await supabase
    .from('blocked_modules')
    .delete()
    .eq('user_id', userId)
    .eq('module_id', moduleId)
  if (error) throw error
}

// ── Activity logs ──

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, profiles!inner(email, name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as unknown as ActivityLog[]
}

export async function logActivity(action: string, details?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action,
    details: details ?? null,
  })
}

// ── Session helpers ──

export function getCurrentSession() {
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback)
}
