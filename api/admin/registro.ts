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
    console.error('Missing environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY')
    return res.status(500).json({ error: 'Error de configuracion del servidor' })
  }

  // ── Verify caller is authenticated and is admin ──
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesion no valida' })
  }

  const token = authHeader.split(' ')[1]

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesion no valida o expirada' })
  }

  const { data: callerProfile, error: profileError } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' })
  }

  // ── Validate input ──
  const { email, password, nombre, apellido_paterno, apellido_materno, role } = req.body

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'El email es obligatorio' })
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'La contrasena es obligatoria' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' })
  }
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Formato de email invalido' })
  }

  const validRole = role === 'admin' ? 'admin' : 'user'

  // ── Create user in Supabase Auth ──
  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })

  if (createError) {
    if (
      createError.message.includes('already registered') ||
      createError.message.includes('already exists')
    ) {
      return res.status(409).json({ error: 'Este correo ya esta registrado' })
    }
    return res.status(400).json({ error: createError.message })
  }

  // ── Insert profile ──
  const { error: insertError } = await serviceClient
    .from('profiles')
    .insert({
      id: newUser.user.id,
      email: email.trim(),
      name: nombre.trim(),
      apellido_paterno: apellido_paterno?.trim() || null,
      apellido_materno: apellido_materno?.trim() || null,
      role: validRole,
      status: 'approved',
    })

  if (insertError) {
    console.error('Error inserting profile:', insertError)
    // Rollback: delete the auth user to avoid orphaned records
    await serviceClient.auth.admin.deleteUser(newUser.user.id)
    return res.status(500).json({ error: 'Error al crear el perfil del usuario' })
  }

  return res.status(200).json({
    message: 'Usuario registrado correctamente',
    user: { id: newUser.user.id, email: email.trim() },
  })
}
