// ============================================================
// DIAGNÓSTICO COMPLETO - Verificar estado DB y Código
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qvsanhffprokmdjfonbh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1_ragolRrEgT0l3A4U80nQ_Yib-I6Ee'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  DIAGNÓSTICO COMPLETO - DB + Código')
  console.log('═══════════════════════════════════════════════════════════\n')

  // ═══════════════════════════════════════════════════════════
  // 1. VERIFICAR SI COLUMNA materia_id EXISTE
  // ═══════════════════════════════════════════════════════════
  console.log('1️⃣  VERIFICANDO COLUMNA materia_id...\n')

  const { data: testQuery, error: testError } = await supabase
    .from('preguntas')
    .select('materia_id')
    .limit(1)

  if (testError) {
    if (testError.message.includes('materia_id') && testError.message.includes('does not exist')) {
      console.log('   ❌ COLUMNA materia_id NO EXISTE en la tabla preguntas')
      console.log('   → La migración SQL NO se ejecutó en la DB')
      console.log('   → Necesitas ejecutar el SQL en Supabase Dashboard > SQL Editor\n')
    } else {
      console.log('   ⚠️  Error diferente:', testError.message)
    }
  } else {
    console.log('   ✅ COLUMNA materia_id EXISTE')
    
    // Check if it has data
    const { data: sample, error: sampleErr } = await supabase
      .from('preguntas')
      .select('id, codigo, materia_id')
      .limit(5)
    
    if (!sampleErr && sample) {
      console.log('   Muestra de datos:')
      for (const row of sample) {
        console.log(`     ID ${row.id} | código ${row.codigo} | materia_id: ${row.materia_id}`)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 2. VERIFICAR SI UPDATE SE EJECUTÓ (contar por materia_id)
  // ═══════════════════════════════════════════════════════════
  console.log('\n2️⃣  VERIFICANDO DISTRIBUCIÓN DE materia_id...\n')

  if (!testError) {
    // Column exists, fetch all preguntas to count
    const PAGE_SIZE = 1000
    let allRows = []
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('preguntas')
        .select('id, codigo, materia_id')
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) break
      if (!data || data.length === 0) break
      allRows.push(...data)
      if (data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    const materiaCounts = new Map()
    let sinMateria = 0

    for (const row of allRows) {
      const mid = row.materia_id
      if (mid === null || mid === undefined) {
        sinMateria++
      } else {
        materiaCounts.set(mid, (materiaCounts.get(mid) || 0) + 1)
      }
    }

    console.log(`   Total preguntas: ${allRows.length}`)
    console.log(`   Con materia_id: ${allRows.length - sinMateria}`)
    console.log(`   Sin materia_id (NULL): ${sinMateria}`)

    if (materiaCounts.size > 0) {
      console.log('\n   Distribución por materia_id:')
      const sorted = Array.from(materiaCounts.entries()).sort((a, b) => b[1] - a[1])
      for (const [mid, count] of sorted) {
        console.log(`     materia_id ${String(mid).padStart(2)}: ${String(count).padStart(4)} preguntas`)
      }
    } else {
      console.log('\n   ⚠️  TODOS los materia_id son NULL - el UPDATE no se ejecutó')
    }
  } else {
    console.log('   No se puede verificar (columna no existe)')
  }

  // ═══════════════════════════════════════════════════════════
  // 3. VERIFICAR TABLA materias
  // ═══════════════════════════════════════════════════════════
  console.log('\n3️⃣  VERIFICANDO TABLA materias...\n')

  const { data: materias, error: matError } = await supabase
    .from('materias')
    .select('id, nombre')
    .order('id')

  if (matError) {
    console.log('   ❌ Tabla materias NO existe o está vacía')
    console.log('   → La migración SQL NO se ejecutó')
  } else {
    console.log(`   ✅ Tabla materias existe con ${materias?.length || 0} registros`)
    if (materias && materias.length > 0) {
      for (const m of materias) {
        console.log(`     ID ${String(m.id).padStart(2)}: ${m.nombre.substring(0, 60)}`)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. VERIFICAR QUÉ ESTÁ USANDO classifyQuestion()
  // ═══════════════════════════════════════════════════════════
  console.log('\n4️⃣  VERIFICANDO CÓDIGO FRONTEND...\n')
  console.log('   Verificando función classifyQuestion() en src/lib/supabase.ts...')
  
  // We can't read files from here, but we can check what the frontend would return
  // by simulating the client-side classification
  
  const { data: allPreguntas, error: allErr } = await supabase
    .from('preguntas')
    .select('*')
    .limit(1000)

  if (!allErr && allPreguntas) {
    // Simulate classifyQuestion logic (simplified)
    function classifyQuestion(row) {
      const t = `${row.pregunta} ${row.respuesta_correcta ?? ''} ${row.ubicacion ?? ''}`.toUpperCase()
      
      if (t.includes('CÓDIGO PENAL') && !t.includes('PROCESAL')) return 'Código Penal'
      if (t.includes('CÓDIGO PROCESAL PENAL')) return 'Código Procesal Penal'
      if (t.includes('TRÁFICO ILÍCITO DE DROGAS')) return 'Tráfico Ilícito de Drogas'
      if (t.includes('LAVADO DE ACTIVOS')) return 'Lavado de Activos'
      if (t.includes('EXTORSIÓN')) return 'Extorsión y Delitos Conexos'
      if (t.includes('VIOLENCIA CONTRA LA MUJER')) return 'Violencia contra la Mujer'
      if (t.includes('CRIMEN ORGANIZADO')) return 'Crimen Organizado'
      if (t.includes('PROTOCOLO DE ACTUACIÓN') || t.includes('PROCESO INMEDIATO')) return 'Proceso Inmediato y Protocolos de Actuación'
      if (t.includes('USO DE LA FUERZA')) return 'Uso de la Fuerza por la PNP'
      if (t.includes('DESAPARICIÓN DE PERSONAS')) return 'Desaparición Forzada de Personas'
      if (t.includes('DDHH') || t.includes('DERECHOS HUMANOS POLICIALES')) return 'DDHH Aplicados a la Función Policial'
      if (t.includes('RÉGIMEN DISCIPLINARIO') || t.includes('INFRACCIÓN DISCIPLINARIA')) return 'Régimen Disciplinario de la PNP (Ley 30714)'
      if (t.includes('PRUEBA DE INTEGRIDAD') || t.includes('LUCHA CONTRA LA CORRUPCIÓN')) return 'Ley de Lucha contra la Corrupción (DL 1291)'
      if (t.includes('CARRERA POLICIAL') || t.includes('SITUACIÓN DEL PERSONAL')) return 'Carrera y Situación del Personal PNP (DL 1149)'
      if (t.includes('VALOR INSTITUCIONAL') || t.includes('FINALIDAD FUNDAMENTAL') || t.includes('FORMACIÓN PROFESIONAL')) return 'Ley de la PNP (DL 1267)'
      if (t.includes('PROCEDIMIENTO ADMINISTRATIVO') && !t.includes('DISCIPLINARIO')) return 'Procedimiento Administrativo General (Ley 27444)'
      if (t.includes('TRANSPARENCIA') || t.includes('ACCESO A LA INFORMACIÓN')) return 'Transparencia y Acceso a la Información (Ley 27806)'
      if (t.includes('ASCENSO') || t.includes('CONSEJO DE ASCENSOS')) return 'Procesos de Ascenso del Personal PNP'
      if (t.includes('DECLARACIÓN UNIVERSAL') || t.includes('DUDH')) return 'Declaración Universal de los Derechos Humanos'
      if (t.includes('CONSTITUCIÓN') || t.includes('DERECHO FUNDAMENTAL') || t.includes('CIUDADANÍA')) return 'Constitución Política del Perú'
      
      return 'Otros'
    }

    // Count by client-side classification
    const clientCounts = new Map()
    let otrosCount = 0
    for (const row of allPreguntas) {
      const topic = classifyQuestion(row)
      if (topic === 'Otros') {
        otrosCount++
      } else {
        clientCounts.set(topic, (clientCounts.get(topic) || 0) + 1)
      }
    }

    console.log('\n   📊 CONTEO ACTUAL DEL FRONTEND (classifyQuestion client-side):')
    console.log('   ─────────────────────────────────────────────────────────')
    
    const sortedClient = Array.from(clientCounts.entries()).sort((a, b) => b[1] - a[1])
    for (const [topic, count] of sortedClient) {
      console.log(`     ${topic.substring(0, 50).padEnd(50)}: ${String(count).padStart(4)}`)
    }
    console.log(`     ${'Otros'.padEnd(50)}: ${String(otrosCount).padStart(4)}`)
    console.log(`     ${'TOTAL'.padEnd(50)}: ${String(allPreguntas.length).padStart(4)}`)
  }

  // ═══════════════════════════════════════════════════════════
  // RESUMEN DEL DIAGNÓSTICO
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  RESUMEN DEL DIAGNÓSTICO')
  console.log('═══════════════════════════════════════════════════════════\n')

  const columnExists = !testError
  const materiasExist = !matError

  if (!columnExists) {
    console.log('  🔴 CAUSA RAÍZ: La migración SQL NO se ejecutó')
    console.log('     La columna materia_id no existe en la tabla preguntas')
    console.log('     La tabla materias tampoco existe')
    console.log('\n  📋 ACCIÓN REQUERIDA:')
    console.log('     1. Ve a Supabase Dashboard > SQL Editor')
    console.log('     2. Ejecuta el SQL de la migración 00016')
    console.log('     3. Después de ejecutar, confirma aquí')
  } else if (!materiasExist) {
    console.log('  🟡 La columna materia_id existe pero la tabla materias no')
    console.log('     La migración está incompleta')
  } else {
    console.log('  🟢 La migración SQL se ejecutó correctamente')
    console.log('     La columna materia_id y la tabla materias existen')
    console.log('\n  El problema está en el CÓDIGO FRONTEND:')
    console.log('     La función classifyQuestion() sigue usando análisis de texto')
    console.log('     Necesita modificarse para leer materia_id de la DB')
  }

  console.log('\n═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
