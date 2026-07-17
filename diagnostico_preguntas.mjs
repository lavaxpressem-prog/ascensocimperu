// ============================================================
// Script de Diagnóstico - Tabla preguntas
// Ejecutar: node diagnostico_preguntas.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qvsanhffprokmdjfonbh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1_ragolRrEgT0l3A4U80nQ_Yib-I6Ee'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Rangos de código por tema (oficial PNP 2026-2027) ──
const CODIGO_RANGOS = [
  { materia_id: 1,  nombre: 'Constitución Política del Perú', min: 180838, max: 181051, esperado: 100 },
  { materia_id: 2,  nombre: 'Declaración Universal de los Derechos Humanos', min: 181052, max: 181066, esperado: 15 },
  { materia_id: 3,  nombre: 'Ley de la PNP (DL 1267)', min: 181082, max: 181239, esperado: 89 },
  { materia_id: 4,  nombre: 'DL 1149 - Carrera y Situación del Personal PNP', min: 181269, max: 181503, esperado: 107 },
  { materia_id: 7,  nombre: 'DL 1318 - Formación Profesional de la PNP', min: 181504, max: 181544, esperado: 40 },
  { materia_id: 5,  nombre: 'DL 1291 - Lucha contra la Corrupción', min: 181591, max: 181640, esperado: 48 },
  { materia_id: 10, nombre: 'Ley 27444 - Procedimiento Administrativo General', min: 181833, max: 181970, esperado: 119 },
  { materia_id: 12, nombre: 'DL 635 - Código Penal', min: 183939, max: 184318, esperado: 168 },
  { materia_id: 11, nombre: 'DL 957 - Código Procesal Penal', min: 184328, max: 184505, esperado: 169 },
  { materia_id: 13, nombre: 'DL 1186 - Uso de la Fuerza por la PNP', min: 184701, max: 184752, esperado: 44 },
  { materia_id: 19, nombre: 'Ley 32130 - Modifica el Código Procesal Penal', min: 184850, max: 184947, esperado: 44 },
  { materia_id: 14, nombre: 'DL 1241 - Tráfico Ilícito de Drogas', min: 184950, max: 184998, esperado: 45 },
  { materia_id: 15, nombre: 'DL 1106 - Lavado de Activos', min: 185046, max: 185162, esperado: 50 },
  { materia_id: 16, nombre: 'Ley 30364 - Violencia contra las Mujeres', min: 185163, max: 185280, esperado: 49 },
  { materia_id: 17, nombre: 'Ley 30077 - Crimen Organizado', min: 185295, max: 185356, esperado: 25 },
  { materia_id: 20, nombre: 'DLeg 1611 - Extorsión', min: 185359, max: 185419, esperado: 25 },
  { materia_id: 22, nombre: 'DLeg 1428 - Desaparición de Personas', min: 185859, max: 185921, esperado: 24 },
  { materia_id: 18, nombre: 'DS 009-2018-JUS - Protocolos de Actuación', min: 185690, max: 185718, esperado: 25 },
  { materia_id: 21, nombre: 'DDHH Función Policial (RM 487-2018-IN)', min: 185988, max: 186062, esperado: 75 },
  { materia_id: 8,  nombre: 'TUO Ley 27806 - Transparencia', min: 186276, max: 186355, esperado: 58 },
  { materia_id: 9,  nombre: 'Ley Procesos de Ascensos PNP', min: 186694, max: 186772, esperado: 40 },
  { materia_id: 6,  nombre: 'Ley 30714 - Régimen Disciplinario PNP', min: 177928, max: 178127, esperado: 122 },
]

async function fetchAllPreguntas() {
  const PAGE_SIZE = 1000
  let allRows = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('preguntas')
      .select('id, codigo, materia_id, numero')
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

async function fetchMaterias() {
  const { data, error } = await supabase
    .from('materias')
    .select('id, nombre')
    .order('id')

  if (error) {
    console.error('Error fetching materias:', error.message)
    return []
  }
  return data || []
}

function getCodigoAsNumber(codigo) {
  if (!codigo) return null
  const num = parseInt(String(codigo).trim(), 10)
  return isNaN(num) ? null : num
}

function getTemaForCodigo(codigoNum) {
  if (!codigoNum) return null
  for (const r of CODIGO_RANGOS) {
    if (codigoNum >= r.min && codigoNum <= r.max) return r
  }
  return null
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  DIAGNÓSTICO - Tabla preguntas - AscensoCIM Perú')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. Fetch data
  console.log('📡 Cargando datos desde Supabase...')
  const [preguntas, materias] = await Promise.all([
    fetchAllPreguntas(),
    fetchMaterias(),
  ])

  console.log(`✅ Preguntas cargadas: ${preguntas.length}`)
  console.log(`✅ Materias en DB: ${materias.length}\n`)

  // Print materias table
  console.log('─── Tabla materias (referencia) ───')
  for (const m of materias) {
    console.log(`  ID ${String(m.id).padStart(2)}: ${m.nombre}`)
  }
  console.log('')

  // ── 1. Estado actual de materia_id ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  1. ESTADO ACTUAL DE materia_id')
  console.log('═══════════════════════════════════════════════════════════\n')

  const materiaIdCounts = new Map()
  let sinMateria = 0
  for (const p of preguntas) {
    const mid = p.materia_id
    if (mid === null || mid === undefined) {
      sinMateria++
    } else {
      materiaIdCounts.set(mid, (materiaIdCounts.get(mid) || 0) + 1)
    }
  }

  console.log(`  Preguntas con materia_id NULL: ${sinMateria}`)
  console.log(`  Preguntas con materia_id asignado: ${preguntas.length - sinMateria}\n`)

  console.log('  Distribución actual por materia_id:')
  const sortedMaterias = Array.from(materiaIdCounts.entries()).sort((a, b) => a[0] - b[0])
  for (const [mid, count] of sortedMaterias) {
    const mat = materias.find(m => m.id === mid)
    const nombre = mat ? mat.nombre.substring(0, 60).padEnd(60) : `ID ${mid} (NO EXISTE EN materias)`
    console.log(`    materia_id ${String(mid).padStart(2)}: ${String(count).padStart(4)} preguntas  | ${nombre}`)
  }
  if (sinMateria > 0) {
    console.log(`    NULL      : ${String(sinMateria).padStart(4)} preguntas  | (sin materia asignada)`)
  }
  console.log('')

  // ── 2. Preview: conteo por rango de código ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  2. PREVIEW: CONTEO POR RANGO DE CÓDIGO')
  console.log('═══════════════════════════════════════════════════════════\n')

  const previewResults = []
  const fueraDeRango = []

  for (const r of CODIGO_RANGOS) {
    const count = preguntas.filter(p => {
      const cn = getCodigoAsNumber(p.codigo)
      return cn !== null && cn >= r.min && cn <= r.max
    }).length

    const diff = count - r.esperado
    const diffStr = diff === 0 ? '=' : (diff > 0 ? `+${diff}` : `${diff}`)

    previewResults.push({
      ...r,
      actual: count,
      diff,
      diffStr,
    })
  }

  // Find questions outside all ranges
  for (const p of preguntas) {
    const cn = getCodigoAsNumber(p.codigo)
    const tema = getTemaForCodigo(cn)
    if (!tema) {
      fueraDeRango.push(p)
    }
  }

  // Print preview table
  console.log('  Tema                                          | Rango código          | Esperado | En DB  | Diff')
  console.log('  ──────────────────────────────────────────────┼──────────────────────┼──────────┼────────┼─────')
  for (const r of previewResults) {
    const nombre = r.nombre.substring(0, 45).padEnd(45)
    const rango = `${r.min}–${r.max}`.padEnd(20)
    const esp = String(r.esperado).padStart(6)
    const act = String(r.actual).padStart(6)
    const diff = r.diffStr.padStart(5)
    console.log(`  ${nombre} | ${rango} | ${esp}   | ${act}  | ${diff}`)
  }
  console.log('  ──────────────────────────────────────────────┼──────────────────────┼──────────┼────────┼─────')

  const totalEnRangos = previewResults.reduce((s, r) => s + r.actual, 0)
  const totalEsperado = previewResults.reduce((s, r) => s + r.esperado, 0)
  console.log(`  ${'TOTAL'.padEnd(45)} | ${''.padEnd(20)} | ${String(totalEsperado).padStart(6)}   | ${String(totalEnRangos).padStart(6)}  | ${(totalEnRangos - totalEsperado > 0 ? '+' : '') + (totalEnRangos - totalEsperado)}`)
  console.log(`\n  Preguntas fuera de rangos conocidos: ${fueraDeRango.length}`)
  console.log('')

  // ── 3. Conflictos: código en rango pero materia_id distinto ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  3. CONFLICTOS: CÓDIGO EN RANGO PERO materia_id DISTINTO')
  console.log('═══════════════════════════════════════════════════════════\n')

  const conflictos = []
  for (const p of preguntas) {
    const cn = getCodigoAsNumber(p.codigo)
    const tema = getTemaForCodigo(cn)
    if (tema && p.materia_id !== null && p.materia_id !== tema.materia_id) {
      const matActual = materias.find(m => m.id === p.materia_id)
      const matEsperada = materias.find(m => m.id === tema.materia_id)
      conflictos.push({
        id: p.id,
        numero: p.numero,
        codigo: p.codigo,
        materia_id_actual: p.materia_id,
        materia_actual: matActual ? matActual.nombre : `ID ${p.materia_id}`,
        materia_id_esperada: tema.materia_id,
        materia_esperada: matEsperada ? matEsperada.nombre : `ID ${tema.materia_id}`,
        tema_rango: tema.nombre,
      })
    }
  }

  if (conflictos.length === 0) {
    console.log('  ✅ No hay conflictos. Todos los códigos en rango tienen el materia_id correcto.\n')
  } else {
    console.log(`  ⚠️  Se encontraron ${conflictos.length} conflictos:\n`)
    console.log('  ID    | #     | Código   | materia_id ACTUAL → ESPERADO | Tema del rango')
    console.log('  ───────┼───────┼──────────┼──────────────────────────────┼───────────────')
    for (const c of conflictos.slice(0, 50)) {
      console.log(`  ${String(c.id).padStart(5)} | ${String(c.numero).padStart(5)} | ${String(c.codigo).padStart(8)} | ${String(c.materia_id_actual).padStart(2)} → ${String(c.materia_id_esperada).padStart(2)}                      | ${c.tema_rango.substring(0, 30)}`)
    }
    if (conflictos.length > 50) {
      console.log(`  ... y ${conflictos.length - 50} conflictos más`)
    }
    console.log('')
  }

  // ── 4. Preguntas fuera de rango ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  4. PREGUNTAS FUERA DE RANGO (sin tema por código)')
  console.log('═══════════════════════════════════════════════════════════\n')

  if (fueraDeRango.length === 0) {
    console.log('  ✅ Todas las preguntas caen dentro de los rangos conocidos.\n')
  } else {
    console.log(`  Total: ${fueraDeRango.length} preguntas fuera de rango\n`)

    // Group by current materia_id
    const byMateria = new Map()
    for (const p of fueraDeRango) {
      const mid = p.materia_id ?? 'NULL'
      if (!byMateria.has(mid)) byMateria.set(mid, [])
      byMateria.get(mid).push(p)
    }

    console.log('  Distribución actual de preguntas fuera de rango:')
    for (const [mid, items] of Array.from(byMateria.entries()).sort((a, b) => {
      const aNum = typeof a[0] === 'number' ? a[0] : -1
      const bNum = typeof b[0] === 'number' ? b[0] : -1
      return aNum - bNum
    })) {
      const mat = mid === 'NULL' ? null : materias.find(m => m.id === mid)
      const nombre = mat ? mat.nombre.substring(0, 50) : '(sin materia)'
      console.log(`    materia_id ${String(mid).padStart(5)}: ${String(items.length).padStart(4)} | ${nombre}`)
    }

    // Show sample codes
    console.log('\n  Muestra de códigos fuera de rango (primeros 20):')
    for (const p of fueraDeRango.slice(0, 20)) {
      const cn = getCodigoAsNumber(p.codigo)
      const mat = p.materia_id ? materias.find(m => m.id === p.materia_id) : null
      console.log(`    ID ${String(p.id).padStart(5)} | # ${String(p.numero).padStart(4)} | código ${String(p.codigo).padStart(8)} (${cn}) | materia_id: ${p.materia_id ?? 'NULL'} ${mat ? mat.nombre.substring(0, 40) : ''}`)
    }
    console.log('')
  }

  // ── 5. Resumen ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  5. RESUMEN')
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log(`  Total preguntas en DB:         ${preguntas.length}`)
  console.log(`  Total en rangos oficiales:     ${totalEnRangos}`)
  console.log(`  Total fuera de rango:          ${fueraDeRango.length}`)
  console.log(`  Conflictos de materia_id:      ${conflictos.length}`)
  console.log(`  Preguntas con NULL materia_id: ${sinMateria}`)
  console.log('')
  console.log('  Se actualizarán:              ' + `${totalEnRangos - conflictos.length} preguntas`)
  console.log('  Se mantienen sin cambio:      ' + `${conflictos.length + fueraDeRango.length} preguntas`)
  console.log('')

  console.log('═══════════════════════════════════════════════════════════')
  console.log('  FIN DEL DIAGNÓSTICO')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
