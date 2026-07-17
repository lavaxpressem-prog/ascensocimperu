// ============================================================
// Script de Diagnóstico - Estructura real de preguntas
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qvsanhffprokmdjfonbh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1_ragolRrEgT0l3A4U80nQ_Yib-I6Ee'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  DIAGNÓSTICO DE ESTRUCTURA - Tabla preguntas')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. Fetch first 5 rows without specifying columns to see actual structure
  console.log('📡 Obteniendo muestra de preguntas (primeras 5 filas)...')
  const { data: sample, error: err1 } = await supabase
    .from('preguntas')
    .select('*')
    .limit(5)

  if (err1) {
    console.error('Error:', err1.message)
    console.error('Details:', err1.details)
    console.error('Hint:', err1.hint)
    console.error('Code:', err1.code)
  } else {
    console.log(`✅ Filas obtenidas: ${sample?.length ?? 0}`)
    if (sample && sample.length > 0) {
      console.log('\n  Columnas encontradas:')
      const cols = Object.keys(sample[0])
      for (const col of cols) {
        const val = sample[0][col]
        const tipo = val === null ? 'null' : typeof val
        console.log(`    - ${col} (${tipo}) = ${JSON.stringify(val)?.substring(0, 100)}`)
      }

      console.log('\n  Muestra completa (primera fila):')
      console.log(JSON.stringify(sample[0], null, 2))
    }
  }

  // 2. Check if materias table exists
  console.log('\n\n📡 Verificando tabla materias...')
  const { data: matSample, error: err2 } = await supabase
    .from('materias')
    .select('*')
    .limit(5)

  if (err2) {
    console.error('Error:', err2.message)
    console.error('Details:', err2.details)
    console.error('Hint:', err2.hint)
    console.error('Code:', err2.code)
  } else {
    console.log(`✅ Materias encontradas: ${matSample?.length ?? 0}`)
    if (matSample && matSample.length > 0) {
      console.log('\n  Columnas:')
      const cols = Object.keys(matSample[0])
      for (const col of cols) {
        console.log(`    - ${col}`)
      }
      console.log('\n  Datos:')
      for (const m of matSample) {
        console.log(`    ID ${m.id}: ${m.nombre}`)
      }
    }
  }

  // 3. Count total preguntas
  console.log('\n\n📡 Contando total de preguntas...')
  const { count, error: err3 } = await supabase
    .from('preguntas')
    .select('id', { count: 'exact', head: true })

  if (err3) {
    console.error('Error:', err3.message)
  } else {
    console.log(`✅ Total preguntas: ${count}`)
  }

  // 4. Check all tables in the database
  console.log('\n\n📡 Verificando tabla question_responses...')
  const { data: qrSample, error: err4 } = await supabase
    .from('user_question_responses')
    .select('*')
    .limit(2)

  if (err4) {
    console.error('Error:', err4.message)
  } else {
    console.log(`✅ user_question_responses: ${qrSample?.length ?? 0} filas`)
    if (qrSample && qrSample.length > 0) {
      console.log('  Columnas:', Object.keys(qrSample[0]).join(', '))
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  FIN DEL DIAGNÓSTICO DE ESTRUCTURA')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
