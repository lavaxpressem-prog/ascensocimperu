import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  const { data: profile } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin access required' })
  }

  const { email, password, nombre, apellidoPaterno, apellidoMaterno, role } = req.body

  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Email, password y nombre son requeridos' })
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
    }
  })

  if (createError) {
    if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
      return res.status(409).json({ error: 'Este correo ya esta registrado' })
    }
    return res.status(400).json({ error: createError.message })
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .insert({
      id: newUser.user.id,
      email,
      name: nombre,
      apellido_paterno: apellidoPaterno || null,
      apellido_materno: apellidoMaterno || null,
      role: role || 'user',
      status: 'approved',
    })

  if (profileError) {
    console.error('Profile insert error:', profileError)
    return res.status(200).json({
      message: 'Usuario creado pero hubo un error al crear el perfil',
      user: { id: newUser.user.id, email }
    })
  }

  return res.status(200).json({
    message: 'Usuario registrado correctamente',
    user: { id: newUser.user.id, email }
  })
}
