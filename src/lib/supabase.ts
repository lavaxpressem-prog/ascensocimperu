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

// ── Dashboard stats helpers ──

export interface DashboardStats {
  dias_estudiados: number
  horas_estudio: number
  ultimo_estudio: string | null
  promedio_aprendizaje: number
  total_examenes: number
  preguntas_respondidas: number
  examenes_aprobados: number
  simuladores_realizados: number
  preguntas_correctas: number
}

export interface RankingEntry {
  user_id: string
  full_name: string
  grade: string
  average_score: number
  total_exams: number
  total_questions: number
  correct_answers: number
}

export interface TopPerformer {
  user_id: string
  full_name: string
  grade: string
  average_score: number
  total_score: number
  exam_count: number
}

export async function getUserDashboardStats(userId: string): Promise<DashboardStats | null> {
  const { data, error } = await supabase
    .rpc('get_user_dashboard_stats', { p_user_id: userId })
    .single()
  if (error) return null
  return data as DashboardStats
}

export async function getUserRankingByGrade(): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .rpc('get_user_ranking_by_grade')
  if (error) return []
  return (data || []) as RankingEntry[]
}

export async function getTopPerformerOfWeek(): Promise<TopPerformer | null> {
  const { data, error } = await supabase
    .rpc('get_top_performer_of_week')
    .single()
  if (error) return null
  return data as TopPerformer
}

export async function recordStudySession(session: {
  activity_type: string
  started_at?: string
  ended_at?: string
  duration_seconds?: number
  questions_attempted?: number
  questions_correct?: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_study_sessions').insert({
    user_id: user.id,
    ...session,
  })
  if (error) throw error
}

export async function recordExamResult(result: {
  exam_type: string
  total_questions: number
  correct_answers: number
  score_percentage: number
  time_spent_seconds?: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_exam_results').insert({
    user_id: user.id,
    ...result,
  })
  if (error) throw error
}

export async function recordQuestionResponse(response: {
  question_identifier?: string
  selected_option: string
  is_correct: boolean
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_question_responses').insert({
    user_id: user.id,
    ...response,
  })
  if (error) throw error
}

// ── Questions helpers ──

export interface Question {
  id: number
  topic: string
  text: string
  options: { id: string; text: string }[]
  correctOption: string
  respuestaCorrecta: string
  indiceCorrecto: number
  ubicacion?: string
}

interface QuestionRow {
  id: number
  numero: number
  pregunta: string
  opciones: { id: string; text: string }[] | string
  respuesta_correcta: string
  indice_correcto: number
  ubicacion: string | null
  codigo: string | null
  created_at: string
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const PAGE_SIZE = 1000

function rowToQuestion(row: QuestionRow): Question {
  let options: { id: string; text: string }[]

  if (Array.isArray(row.opciones)) {
    options = row.opciones.map((opt, i) => ({
      id: opt.id || LETTERS[i] || String(i),
      text: opt.text || String(opt),
    }))
  } else if (typeof row.opciones === 'string') {
    try {
      const parsed = JSON.parse(row.opciones)
      if (Array.isArray(parsed)) {
        options = parsed.map((opt: any, i: number) => ({
          id: opt.id || LETTERS[i] || String(i),
          text: opt.text || String(opt),
        }))
      } else {
        options = []
      }
    } catch {
      options = []
    }
  } else {
    options = []
  }

  const correctOption = LETTERS[row.indice_correcto] ?? String(row.indice_correcto)

  return {
    id: row.id,
    topic: String(row.numero),
    text: row.pregunta,
    options,
    correctOption,
    respuestaCorrecta: row.respuesta_correcta,
    indiceCorrecto: row.indice_correcto,
    ubicacion: row.ubicacion ?? undefined,
  }
}

const PREGUNTAS_COLUMNS = 'id, numero, pregunta, opciones, respuesta_correcta, indice_correcto, ubicacion, codigo, created_at'

async function fetchAllPreguntas(): Promise<QuestionRow[]> {
  const allRows: QuestionRow[] = []
  let offset = 0

  while (true) {
    let query = supabase
      .from('preguntas')
      .select(PREGUNTAS_COLUMNS)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    const { data, error, status, statusText } = await query

    console.log('[fetchAllPreguntas] status:', status, statusText)
    console.log('[fetchAllPreguntas] data:', data)
    if (error) {
      console.error('[fetchAllPreguntas] error:', JSON.stringify(error, null, 2))
      break
    }
    if (!data || data.length === 0) break

    allRows.push(...(data as QuestionRow[]))

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return allRows
}

export async function getQuestionsBatch(): Promise<Question[]> {
  const rows = await fetchAllPreguntas()
  return rows.map(rowToQuestion)
}

export async function getQuestionsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('preguntas')
    .select('id', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

export async function getQuestionsByMateria(materiaId: number): Promise<Question[]> {
  const rows = await fetchAllPreguntas()

  const topicMap = new Map<string, number>()
  let idx = 0
  for (const row of rows) {
    const topic = classifyQuestion(row)
    if (!topicMap.has(topic)) {
      topicMap.set(topic, idx)
      idx++
    }
  }

  const topicEntries = Array.from(topicMap.entries())
  const entry = topicEntries.find(([, id]) => id === materiaId)
  if (!entry) return rows.map(rowToQuestion)

  const topicName = entry[0]
  return rows
    .filter(row => classifyQuestion(row) === topicName)
    .map(rowToQuestion)
}

export async function getRandomQuestions(count: number): Promise<Question[]> {
  const rows = await fetchAllPreguntas()
  const shuffled = rows.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(rowToQuestion)
}

// ── Question classifier ──

function classifyQuestion(row: QuestionRow): string {
  const t = `${row.pregunta} ${row.respuesta_correcta ?? ''} ${row.ubicacion ?? ''}`.toUpperCase()

  if (t.includes('CÓDIGO PENAL') && !t.includes('PROCESAL') && !t.includes('TRÁFICO') && !t.includes('EXTORSIÓN') && !t.includes('LAVADO') && !t.includes('DROGAS') && !t.includes('VIOLENCIA') && !t.includes('CRIMEN ORGANIZADO') && !t.includes('MUJER')) return 'Código Penal'
  if (t.includes('CÓDIGO PROCESAL PENAL') || t.includes('INVESTIGACIÓN PREPARATORIA') || t.includes('PRISIÓN PREVENTIVA') || t.includes('MEDIDA CAUTELAR') || t.includes('PROCESO PENAL') || t.includes('INVESTIGACIÓN DEL DELITO') || t.includes('ÁMBITO DE ACTUACIÓN JURISDICCIONAL')) return 'Código Procesal Penal'
  if (t.includes('TRÁFICO ILÍCITO DE DROGAS') || t.includes('ESTUPEFACIENTES')) return 'Tráfico Ilícito de Drogas'
  if (t.includes('LAVADO DE ACTIVOS') || t.includes('CONVIERTE O TRANSFIERE DINERO') || t.includes('MINERÍA ILEGAL')) return 'Lavado de Activos'
  if (t.includes('EXTORSIÓN') || t.includes('DELITOS CONEXOS') || t.includes('ÁMBITO DE APLICACIÓN TERRITORIAL DEL DECRETO LEGISLATIVO 1611')) return 'Extorsión y Delitos Conexos'
  if (t.includes('VIOLENCIA CONTRA LA MUJER') || t.includes('VIOLENCIA FAMILIAR')) return 'Violencia contra la Mujer'
  if (t.includes('CRIMEN ORGANIZADO') || t.includes('ORGANIZACIÓN CRIMINAL')) return 'Crimen Organizado'
  if (t.includes('PROTOCOLO DE ACTUACIÓN') || t.includes('PROCESO INMEDIATO')) return 'Proceso Inmediato y Protocolos de Actuación'
  if (t.includes('USO DE LA FUERZA') || t.includes('FUERZA POLICIAL')) return 'Uso de la Fuerza por la PNP'
  if (t.includes('DESAPARICIÓN DE PERSONAS')) return 'Desaparición Forzada de Personas'
  if (t.includes('DDHH') || t.includes('DERECHOS HUMANOS POLICIALES') || t.includes('RESOLUCIÓN MINISTERIAL 487') || (t.includes('NIVEL DE FUERZA') && t.includes('EMPLEAR'))) return 'DDHH Aplicados a la Función Policial'

  if (t.includes('RÉGIMEN DISCIPLINARIO') || t.includes('INFRACCIÓN DISCIPLINARIA') || t.includes('PROCEDIMIENTO ADMINISTRATIVO-DISCIPLINARIO') || t.includes('TRIBUNAL DE DISCIPLINA') || t.includes('SANCIÓN DISCIPLINARIA') || t.includes('IMPUTACIÓN') && t.includes('INFRACCIÓN') || t.includes('DESCARGO POR ESCRITO')) return 'Régimen Disciplinario de la PNP (Ley 30714)'

  if (t.includes('PRUEBA DE INTEGRIDAD') || t.includes('PRUEBA DE CONTROL Y CONFIANZA') || t.includes('DECLARACIÓN JURADA') || t.includes('INTEGRIDAD INSTITUCIONAL') || t.includes('DIRCOCOR') || t.includes('OFICINA DE CONTROL, CUMPLIMIENTO Y CONFIANZA') || t.includes('OFICINA GENERAL DE INTEGRIDAD') || t.includes('PRUEBA DE DESCARTE') || t.includes('LUCHA CONTRA LA CORRUPCIÓN') || t.includes('DECRETO LEGISLATIVO 1291') || t.includes('D.L. 1291')) return 'Ley de Lucha contra la Corrupción (DL 1291)'

  if (t.includes('CARRERA POLICIAL') || t.includes('INICIO DE LA CARRERA') || t.includes('SITUACIÓN DEL PERSONAL') || t.includes('ASIMILACIÓN') || (t.includes('EFECTIVIDAD') && t.includes('GRADO')) || t.includes('CALIFICACIÓN ANUAL') || t.includes('ASIGNACIÓN DE CARGOS') || t.includes('REASIGNACIÓN') || (t.includes('RETIRO') && t.includes('PERSONAL')) || (t.includes('EMPLEO') && t.includes('CATEGORÍA')) || t.includes('EVALUACIÓN DEL DESEMPEÑO') || t.includes('DERECHOS DE CARRERA') || t.includes('PERÍODO DE ASIMILACIÓN') || t.includes('SITUACIÓN DE ACTIVIDAD EN CUADROS') || t.includes('NOTA DE EVALUACIÓN') || t.includes('LISTA ANUAL DE RENDIMIENTO')) return 'Carrera y Situación del Personal PNP (DL 1149)'

  if (t.includes('VALOR INSTITUCIONAL') || t.includes('PRINCIPIO INSTITUCIONAL') || t.includes('FINALIDAD FUNDAMENTAL') || t.includes('DIRECCIÓN NACIONAL') || t.includes('COMANDANCIA GENERAL') || t.includes('ESTADO MAYOR') || t.includes('INSPECTORÍA GENERAL') || t.includes('FORMACIÓN PROFESIONAL POLICIAL') || t.includes('ÓRGANOS CONSULTIVOS') || t.includes('SITUACIÓN DE ACTIVIDAD') && t.includes('PNP') || t.includes('SITUACIÓN DE DISPONIBILIDAD') || t.includes('ÓRGANOS DE INVESTIGACIÓN') && t.includes('PNP') || t.includes('DIRECCIÓN DE ORDEN') || (t.includes('SEGURIDAD CIUDADANA') && t.includes('COMITÉ')) || (t.includes('BIENESTAR') && t.includes('PERSONAL')) || (t.includes('VOCACIÓN') && t.includes('POLICIAL')) || (t.includes('CORTESÍA') && t.includes('CIUDADANO')) || (t.includes('DISCIPLINA') && t.includes('VALOR')) || t.includes('PERTENENCIA INSTITUCIONAL') || (t.includes('SERVICIO') && t.includes('VALOR') && t.includes('POLICIAL')) || t.includes('SISTEMA DISCIPLINARIO POLICIAL') || t.includes('PERSONAL DE ARMAS') && t.includes('UNIFORME') || t.includes('ESPECIALIDAD FUNCIONAL')) return 'Ley de la PNP (DL 1267)'

  if (t.includes('PROCEDIMIENTO ADMINISTRATIVO') && !t.includes('DISCIPLINARIO') || t.includes('ACTO ADMINISTRATIVO') || t.includes('NULIDAD') && t.includes('ACTO') || t.includes('RECURSO ADMINISTRATIVO') || t.includes('VÍA ADMINISTRATIVA') || t.includes('NOTIFICACIÓN') && t.includes('ADMINISTRATIVO') || t.includes('LEY 27444') || t.includes('DERECHO ADMINISTRATIVO')) return 'Procedimiento Administrativo General (Ley 27444)'

  if (t.includes('TRANSPARENCIA') || t.includes('ACCESO A LA INFORMACIÓN PÚBLICA') || t.includes('SOLICITUD DE ACCESO') || t.includes('INFORMACIÓN RESERVADA') || t.includes('LEY 27806') || (t.includes('PLAZO DE RESPUESTA') && t.includes('INFORMACIÓN'))) return 'Transparencia y Acceso a la Información (Ley 27806)'

  if (t.includes('ASCENSO') || t.includes('PROCESO DE ASCENSO') || t.includes('CONSEJO DE ASCENSOS') || t.includes('EVALUACIÓN DE MERITOS') || t.includes('TIEMPO MÍNIMO DE SERVICIOS')) return 'Procesos de Ascenso del Personal PNP'

  if (t.includes('DECLARACIÓN UNIVERSAL') || (t.includes('DERECHOS HUMANOS') && !t.includes('POLICIALES') && !t.includes('PNP')) || t.includes('DUDH') || t.includes('TODA PERSONA TIENE DEBERES RESPECTO')) return 'Declaración Universal de los Derechos Humanos'

  if (t.includes('CONSTITUCIÓN') || t.includes('DERECHO FUNDAMENTAL') || (t.includes('CIUDADANÍA')) || (t.includes('PRESIDENTE DE LA REPÚBLICA') && !t.includes('PNP')) || t.includes('CONGRESO') && t.includes('REPÚBLICA') || t.includes('PODER EJECUTIVO') || t.includes('PODER LEGISLATIVO') || t.includes('PODER JUDICIAL') || t.includes('TRIBUNAL CONSTITUCIONAL') || t.includes('INCONSTITUCIONALIDAD') || t.includes('REFERÉNDUM') || t.includes('ACCIÓN POPULAR') || t.includes('HABEAS CORPUS') || t.includes('AMPARO') || t.includes('SECRETO BANCARIO') || t.includes('EXTRADICIÓN') || t.includes('INVIOLABILIDAD') || (t.includes('COMUNICACIONES') && t.includes('JUEZ')) || (t.includes('CIUDADANOS') && t.includes('DERECHO')) || t.includes('SINDICACIÓN Y HUELGA') || t.includes('SIMBOLOS DE LA PATRIA')) return 'Constitución Política del Perú'

  return 'Otros'
}

// ── Topics helpers ──

export interface TopicWithCount {
  id: number
  nombre: string
  count: number
}

export async function getTopicsWithCount(): Promise<TopicWithCount[]> {
  const rows = await fetchAllPreguntas()
  console.log('[PracticaPage] Total preguntas cargadas:', rows.length)

  const topicCounts = new Map<string, number>()

  for (const row of rows) {
    const topic = classifyQuestion(row)
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
  }

  const topics: TopicWithCount[] = Array.from(topicCounts.entries())
    .map(([nombre, count], id) => ({ id, nombre, count }))
    .sort((a, b) => b.count - a.count)

  console.log('[PracticaPage] Temas encontrados:', topics.length)
  topics.forEach(t => console.log(`  - ${t.nombre}: ${t.count} preguntas`))

  return topics
}

// ── Session helpers ──

export function getCurrentSession() {
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback)
}
