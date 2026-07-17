// ============================================================
// Ejecutor de Migración - 00016_reclassify_preguntas
// Ejecuta los pasos de la migración via Supabase client
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qvsanhffprokmdjfonbh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1_ragolRrEgT0l3A4U80nQ_Yib-I6Ee'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .limit(1)
  
  // If we can query information_schema, check directly
  // Otherwise, try to select from the table
  if (error) {
    // Try selecting from the table to see if it exists
    const { error: testError } = await supabase.from(tableName).select('id').limit(1)
    return !testError
  }
  return data && data.length > 0
}

async function fetchAllPreguntas() {
  const PAGE_SIZE = 1000
  let allRows = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('preguntas')
      .select('id, codigo')
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

// Mapa de materia_id a rangos de código
const MATERIA_RANGES = [
  { materia_id: 1,  min: 180838, max: 181051 },
  { materia_id: 2,  min: 181052, max: 181066 },
  { materia_id: 3,  min: 181082, max: 181239 },
  { materia_id: 4,  min: 181269, max: 181503 },
  { materia_id: 5,  min: 181591, max: 181640 },
  { materia_id: 6,  min: 177928, max: 178127 },
  { materia_id: 7,  min: 181504, max: 181544 },
  { materia_id: 8,  min: 186276, max: 186355 },
  { materia_id: 9,  min: 186694, max: 186772 },
  { materia_id: 10, min: 181833, max: 181970 },
  { materia_id: 11, min: 184328, max: 184505 },
  { materia_id: 12, min: 183939, max: 184318 },
  { materia_id: 13, min: 184701, max: 184752 },
  { materia_id: 14, min: 184950, max: 184998 },
  { materia_id: 15, min: 185046, max: 185162 },
  { materia_id: 16, min: 185163, max: 185280 },
  { materia_id: 17, min: 185295, max: 185356 },
  { materia_id: 18, min: 185690, max: 185718 },
  { materia_id: 19, min: 184850, max: 184947 },
  { materia_id: 20, min: 185359, max: 185419 },
  { materia_id: 21, min: 185988, max: 186062 },
  { materia_id: 22, min: 185859, max: 185921 },
]

function getCodigoAsNumber(codigo) {
  if (!codigo) return null
  const num = parseInt(String(codigo).trim(), 10)
  return isNaN(num) ? null : num
}

function getMateriaIdForCodigo(codigoNum) {
  if (!codigoNum) return null
  for (const r of MATERIA_RANGES) {
    if (codigoNum >= r.min && codigoNum <= r.max) return r.materia_id
  }
  return null
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  EJECUTOR DE MIGRACIÓN 00016')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Step 1: Check if materias table exists and has data
  console.log('📡 PASO 1: Verificando tabla materias...')
  const { data: materiasCheck, error: materiasError } = await supabase
    .from('materias')
    .select('id')
    .limit(1)

  let materiasExists = !materiasError
  let materiasCount = 0

  if (materiasExists) {
    const { count } = await supabase.from('materias').select('id', { count: 'exact', head: true })
    materiasCount = count || 0
    console.log(`  ✅ Tabla materias existe con ${materiasCount} registros`)
  } else {
    console.log(`  ⚠️  Tabla materias NO existe o está vacía`)
  }

  // Step 2: Check if materia_id column exists in preguntas
  console.log('\n📡 PASO 2: Verificando columna materia_id...')
  const { data: colCheck, error: colError } = await supabase
    .from('preguntas')
    .select('materia_id')
    .limit(1)

  let materiaIdExists = !colError
  if (materiaIdExists) {
    console.log(`  ✅ Columna materia_id ya existe`)
  } else {
    console.log(`  ⚠️  Columna materia_id NO existe`)
  }

  // Step 3: Fetch all preguntas for analysis
  console.log('\n📡 PASO 3: Cargando todas las preguntas...')
  const preguntas = await fetchAllPreguntas()
  console.log(`  ✅ Preguntas cargadas: ${preguntas.length}`)

  // Step 4: Analyze what needs to be updated
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  ANÁLISIS PREVIO A LA MIGRACIÓN')
  console.log('═══════════════════════════════════════════════════════════\n')

  let conMateria = 0
  let sinMateria = 0
  const updatesNecesarios = new Map()

  for (const p of preguntas) {
    const cn = getCodigoAsNumber(p.codigo)
    const materiaId = getMateriaIdForCodigo(cn)

    if (materiaId) {
      if (!materiaIdExists || p.materia_id === null || p.materia_id === undefined) {
        // Need to update
        const current = updatesNecesarios.get(materiaId) || 0
        updatesNecesarios.set(materiaId, current + 1)
      } else if (p.materia_id === materiaId) {
        conMateria++
      } else {
        // Different materia_id - need to update
        const current = updatesNecesarios.get(materiaId) || 0
        updatesNecesarios.set(materiaId, current + 1)
      }
    } else {
      sinMateria++
    }
  }

  console.log(`  Preguntas ya con materia_id correcto: ${conMateria}`)
  console.log(`  Preguntas fuera de rango (quedan NULL): ${sinMateria}`)
  console.log(`  Preguntas a actualizar: ${Array.from(updatesNecesarios.values()).reduce((a, b) => a + b, 0)}`)

  if (updatesNecesarios.size > 0) {
    console.log('\n  Distribución de updates por tema:')
    for (const [materiaId, count] of Array.from(updatesNecesarios.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`    materia_id ${String(materiaId).padStart(2)}: ${count} preguntas`)
    }
  }

  // Step 5: Execute updates via Supabase client
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  EJECUCIÓN DE ACTUALIZACIONES')
  console.log('═══════════════════════════════════════════════════════════\n')

  if (updatesNecesarios.size === 0) {
    console.log('  ✅ No hay actualizaciones necesarias. Todos los datos ya están correctos.')
  } else {
    let totalUpdated = 0
    let totalErrors = 0

    // Process each materia_id group
    for (const [materiaId, expectedCount] of updatesNecesarios.entries()) {
      console.log(`  📝 Actualizando materia_id = ${materiaId}...`)

      // Find all preguntas that need this materia_id
      const toUpdate = preguntas.filter(p => {
        const cn = getCodigoAsNumber(p.codigo)
        const targetId = getMateriaIdForCodigo(cn)
        if (targetId !== materiaId) return false

        // Check if already correct
        if (p.materia_id === materiaId) return false

        return true
      })

      if (toUpdate.length === 0) {
        console.log(`    ✅ Ya está actualizado`)
        continue
      }

      // Update in batches
      const BATCH_SIZE = 100
      let updated = 0
      let errors = 0

      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE)

        for (const p of batch) {
          const { error } = await supabase
            .from('preguntas')
            .update({ materia_id: materiaId })
            .eq('id', p.id)

          if (error) {
            console.error(`    ❌ Error updating ID ${p.id}:`, error.message)
            errors++
          } else {
            updated++
          }
        }
      }

      console.log(`    ✅ Actualizadas: ${updated}/${toUpdate.length}${errors > 0 ? ` | Errores: ${errors}` : ''}`)
      totalUpdated += updated
      totalErrors += errors
    }

    console.log(`\n  📊 RESUMEN DE ACTUALIZACIONES:`)
    console.log(`     Total actualizadas: ${totalUpdated}`)
    console.log(`     Total errores: ${totalErrors}`)
  }

  // Step 6: Final verification
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  VERIFICACIÓN FINAL')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Re-fetch preguntas to verify
  const updatedPreguntas = await fetchAllPreguntas()
  const verifyMateriaCounts = new Map()
  let verifySinMateria = 0

  for (const p of updatedPreguntas) {
    const mid = p.materia_id
    if (mid === null || mid === undefined) {
      verifySinMateria++
    } else {
      verifyMateriaCounts.set(mid, (verifyMateriaCounts.get(mid) || 0) + 1)
    }
  }

  console.log(`  Total preguntas verificadas: ${updatedPreguntas.length}`)
  console.log(`  Con materia_id asignado: ${updatedPreguntas.length - verifySinMateria}`)
  console.log(`  Sin materia_id (NULL): ${verifySinMateria}`)

  if (verifySinMateria > 0) {
    console.log(`\n  ⚠️  Hay ${verifySinMateria} preguntas sin materia_id (fuera de rangos conocidos)`)
  } else {
    console.log(`\n  ✅ Todas las preguntas tienen materia_id asignado`)
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  MIGRACIÓN COMPLETADA')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('\n  Próximos pasos:')
  console.log('  1. Ejecutar la migración SQL en Supabase SQL Editor para:')
  console.log('     - Crear tabla materias')
  console.log('     - Agregar foreign key constraint')
  console.log('     - Configurar RLS')
  console.log('     - Crear índices')
  console.log('  2. Simplificar classifyQuestion() en TypeScript')
  console.log('  3. Verificar que la app compile sin errores')
}

main().catch(console.error)
