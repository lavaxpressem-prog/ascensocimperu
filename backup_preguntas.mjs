// ============================================================
// Script de Backup - Tabla preguntas
// Crea un respaldo local de todas las preguntas
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SUPABASE_URL = 'https://qvsanhffprokmdjfonbh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1_ragolRrEgT0l3A4U80nQ_Yib-I6Ee'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function fetchAllPreguntas() {
  const PAGE_SIZE = 1000
  let allRows = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('preguntas')
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('Error fetching:', error.message)
      break
    }
    if (!data || data.length === 0) break

    allRows.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return allRows
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  BACKUP - Tabla preguntas')
  console.log('═══════════════════════════════════════════════════════════\n')

  console.log('📡 Cargando todas las preguntas...')
  const preguntas = await fetchAllPreguntas()
  console.log(`✅ Preguntas cargadas: ${preguntas.length}`)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const filename = `backup_preguntas_${timestamp}.json`

  console.log(`\n💾 Guardando respaldo en: ${filename}`)
  writeFileSync(filename, JSON.stringify(preguntas, null, 2), 'utf-8')

  console.log(`✅ Backup guardado exitosamente`)
  console.log(`   Tamaño: ${(Buffer.byteLength(JSON.stringify(preguntas)) / 1024).toFixed(1)} KB`)

  // Also create a SQL backup script
  const sqlFilename = `backup_preguntas_${timestamp}.sql`
  let sql = `-- ============================================================\n`
  sql += `-- BACKUP de tabla preguntas - ${new Date().toISOString()}\n`
  sql += `-- Generado automáticamente por backup_preguntas.mjs\n`
  sql += `-- ============================================================\n\n`
  sql += `-- Para restaurar, ejecutar este script en Supabase SQL Editor\n`
  sql += `-- NOTA: Esto eliminará todas las preguntas actuales y las reemplazará con este backup\n\n`
  sql += `-- 1. Eliminar datos actuales\n`
  sql += `-- TRUNCATE TABLE public.preguntas CASCADE;\n\n`
  sql += `-- 2. Insertar datos del backup\n`

  for (const p of preguntas) {
    const opciones = JSON.stringify(p.opciones).replace(/'/g, "''")
    const pregunta = (p.pregunta || '').replace(/'/g, "''")
    const respuesta = (p.respuesta_correcta || '').replace(/'/g, "''")
    const ubicacion = (p.ubicacion || '').replace(/'/g, "''")
    const codigo = (p.codigo || '').replace(/'/g, "''")

    sql += `INSERT INTO public.preguntas (id, numero, pregunta, opciones, respuesta_correcta, indice_correcto, ubicacion, codigo, created_at) VALUES (${p.id}, ${p.numero}, '${pregunta}', '${opciones}'::jsonb, '${respuesta}', ${p.indice_correcto}, '${ubicacion}', '${codigo}', '${p.created_at}');\n`
  }

  writeFileSync(sqlFilename, sql, 'utf-8')
  console.log(`\n📄 Script SQL de respaldo: ${sqlFilename}`)
  console.log(`   Tamaño: ${(Buffer.byteLength(sql) / 1024).toFixed(1)} KB`)

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  BACKUP COMPLETADO')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
