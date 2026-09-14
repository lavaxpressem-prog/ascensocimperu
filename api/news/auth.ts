import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export interface AuthUser {
  id: string
  email: string
  role: string
}

export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<AuthUser | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  const token = authHeader.split(' ')[1]
  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)

  if (authError || !user) {
    res.status(401).json({ error: 'Invalid session' })
    return null
  }

  const { data: profile } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin access required' })
    return null
  }

  return { id: user.id, email: user.email || '', role: profile.role }
}

export function getServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
