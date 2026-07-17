// ============================================================
// Script de Diagnóstico V2 - Sin depender de materia_id
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qvsanhffprokmdjfonbh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1_ragolRrEgT0l3A4U80nQ_Yib-I6Ee'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Materias oficiales (las 22 del banco PNP 2026-2027) ──
const MATERIAS_OFICIALES = [
  { id: 1,  nombre: 'CONSTITUCIÓN POLÍTICA DEL PERÚ (TEXTO ACTUALIZADO INCLUIDO SUS MODIFICATORIAS LEY 31988 DEL 20MAY2024).', min: 180838, max: 181051, esperado: 100 },
  { id: 2,  nombre: 'DECLARACIÓN UNIVERSAL DE LOS DERECHOS HUMANOS', min: 181052, max: 181066, esperado: 15 },
  { id: 3,  nombre: 'LEY DE LA PNP - DECRETO LEGISLATIVO N° 1267 Y SUS MODIFICATORIAS (DECRETO LEGISLATIVO 1318 Y DECRETO LEGISLATIVO N°1451)', min: 181082, max: 181239, esperado: 89 },
  { id: 4,  nombre: 'DECRETO LEGISLATIVO N°1149 - LEY DE LA CARRERA Y SITUACIÓN DEL PERSONAL PNP Y SU MODIFICATORIA, D.L. N°1230, D.L. N°242, LEY 30686 Y LEY N° 31379 (NO INCLUYE ANEXOS I,II Y III)', min: 181269, max: 181503, esperado: 107 },
  { id: 5,  nombre: 'DECRETO LEGISLATIVO N°1291 - LEY DE LUCHA CONTRA LA CORRUPCIÓN EN EL SECTOR INTERIOR Y SU REGLAMENTO DECRETO SUPREMO N°013-17-IN. (MODIFICADO POR EL D.S. N°001-2019-IN)', min: 181591, max: 181640, esperado: 48 },
  { id: 6,  nombre: 'LEY Nº 30714 - LEY DE RÉGIMEN DISCIPLINARIO DE LA POLICIA NACIONAL DEL PERÚ', min: 177928, max: 178127, esperado: 122 },
  { id: 7,  nombre: 'DECRETO LEGISLATIVO N° 1318 - LEY QUE REGULA LA FORMACIÓN PROFESIONAL DE LA POLICÍA NACIONAL DEL PERÚ', min: 181504, max: 181544, esperado: 40 },
  { id: 8,  nombre: 'TUO de la Ley 27806 "Ley de Trasparencia y Acceso a la Información Pública" (DS. 021-2019-JUS)', min: 186276, max: 186355, esperado: 58 },
  { id: 9,  nombre: 'LEY QUE REGULA LOS PROCESOS DE ASCENSOS DEL PERSONAL DE LA POLICÍA NACIONAL DEL PERÚ', min: 186694, max: 186772, esperado: 40 },
  { id: 10, nombre: 'LEY 27444 - LEY DEL PROCEDIMIENTO ADMINISTRATIVO GENERAL', min: 181833, max: 181970, esperado: 119 },
  { id: 11, nombre: 'DECRETO LEGISLATIVO Nº 957 CÓDIGO PROCESAL PENAL Y SUS MODIFICATORIAS HASTA 31MAR2023', min: 184328, max: 184505, esperado: 169 },
  { id: 12, nombre: 'DECRETO LEGISLATIVO Nº 635 CÓDIGO PENAL Y SUS MODIFICATORIAS (NO INCLUYE PENAS)', min: 183939, max: 184318, esperado: 168 },
  { id: 13, nombre: 'DECRETO LEGISLATIVO Nº 1186 LEY QUE REGULA EL USO DE LA FUERZA POR PARTE DE LA PNP, SUS MODIFICATORIAS Y SU REGLAMENTO DS. N°012-2016-IN', min: 184701, max: 184752, esperado: 44 },
  { id: 14, nombre: 'DECRETO LEGISLATIVO Nº 1241 QUE FORTALECE LA LUCHA CONTRA EL TRAFICO ILÍCITO DE DROGAS', min: 184950, max: 184998, esperado: 45 },
  { id: 15, nombre: 'DECRETO LEGISLATIVO Nº 1106 - LUCHA EFICAZ CONTRA EL LAVADO DE ACTIVOS Y OTROS DELITOS RELACIONADOS A LA MINERIA ILEGAL Y CRIMEN ORGANIZADO Y SUS MODIFICATORIAS', min: 185046, max: 185162, esperado: 50 },
  { id: 16, nombre: 'LEY Nº 30364 LEY PARA PREVENIR, SANCIONAR Y ERRADICAR LA VIOLENCIA CONTRA LAS MUJERES Y LOS INTEGRANTES DEL GRUPO FAMILIAR Y SUS MODIFICATORIAS', min: 185163, max: 185280, esperado: 49 },
  { id: 17, nombre: 'LEY Nº 30077 - CONTRA EL CRIMEN ORGANIZADO Y SUS MODIFICATORIAS (DL Nº 1244) AL 31MAR2023', min: 185295, max: 185356, esperado: 25 },
  { id: 18, nombre: 'DECRETO SUPREMO N° 009- 2018-JUS - PROTOCOLOS DE ACTUACIÓN LNTERINSTITUCIONAL ESPECIFICO PARA LA APLICACION DEL PROCESO INMEDIATO REFORMADO Y EL DS N°010-2018-JUS -PROTOCOLOS DE ACTUACIÓN INTERINSTITUCIONAL DE CARACTER SISTEMICO Y TRANSVERSAL PARA LA APLICACIÓN DEL CÓDIGO PROCESAL PENAL', min: 185690, max: 185718, esperado: 25 },
  { id: 19, nombre: 'LEY 32130 - LEY QUE MODIFICA EL CÓDIGO PROCESAL PENAL, D.LEG 957, PARA FORTALECER LA INVESTIGACIÓN DEL DELITO COMO FUNCIÓN DE LA POLICÍA NACIONAL DEL PERÚ Y AGILIZAR LOS PROCESOS PENALES', min: 184850, max: 184947, esperado: 44 },
  { id: 20, nombre: 'D.LEG 1611 - QUE APRUEBA MEDIDAS ESPECIALES PARA LA PREVENCIÓN E INVESTIGACIÓN DEL DELITO DE EXTORSIÓN Y DELITOS CONEXOS.', min: 185359, max: 185419, esperado: 25 },
  { id: 21, nombre: 'DDHH APLICADOS A LA FUNCIÓN POLICIAL (RESOLUCIÓN MINISTERIAL N.º 487-2018IN) 2DA PARTE', min: 185988, max: 186062, esperado: 75 },
  { id: 22, nombre: 'D.LEG. 1428 - QUE DESARROLLA MEDIDAS PARA LA ATENCION DE CASOS DE DESAPARICION DE PERSONAS EN SITUACI0N DE VULNERABILIDAD.', min: 185859, max: 185921, esperado: 24 },
]

async function fetchAllPreguntas() {
  const PAGE_SIZE = 1000
  let allRows = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('preguntas')
      .select('id, codigo, numero')
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

function getCodigoAsNumber(codigo) {
  if (!codigo) return null
  const num = parseInt(String(codigo).trim(), 10)
  return isNaN(num) ? null : num
}

function getTemaForCodigo(codigoNum) {
  if (!codigoNum) return null
  for (const r of MATERIAS_OFICIALES) {
    if (codigoNum >= r.min && codigoNum <= r.max) return r
  }
  return null
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  DIAGNÓSTICO V2 - Tabla preguntas (sin materia_id)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. Fetch data
  console.log('📡 Cargando datos desde Supabase...')
  const preguntas = await fetchAllPreguntas()
  console.log(`✅ Preguntas cargadas: ${preguntas.length}\n`)

  // ── 1. Estado actual ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  1. ESTADO ACTUAL')
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log(`  Total preguntas: ${preguntas.length}`)
  console.log(`  Columna materia_id: NO EXISTE (se creará)`)
  console.log(`  Tabla materias: VACÍA (se poblará)`)
  console.log('')

  // ── 2. Preview: conteo por rango de código ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  2. PREVIEW: CONTEO ESPERADO POR TEMA (según código)')
  console.log('═══════════════════════════════════════════════════════════\n')

  const previewResults = []
  const fueraDeRango = []
  const sinCodigo = []

  for (const r of MATERIAS_OFICIALES) {
    const matches = preguntas.filter(p => {
      const cn = getCodigoAsNumber(p.codigo)
      return cn !== null && cn >= r.min && cn <= r.max
    })

    const count = matches.length
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
    if (!p.codigo) {
      sinCodigo.push(p)
    }
  }

  // Print preview table
  console.log('  #  | Tema                                           | Rango              | Esperado | En DB | Diff')
  console.log('  ───┼────────────────────────────────────────────────┼────────────────────┼──────────┼───────┼─────')
  for (let i = 0; i < previewResults.length; i++) {
    const r = previewResults[i]
    const num = String(r.id).padStart(2)
    const nombre = r.nombre.substring(0, 44).padEnd(44)
    const rango = `${r.min}–${r.max}`.padEnd(18)
    const esp = String(r.esperado).padStart(6)
    const act = String(r.actual).padStart(5)
    const diff = r.diffStr.padStart(5)
    console.log(`  ${num} | ${nombre} | ${rango} | ${esp}   | ${act}  | ${diff}`)
  }
  console.log('  ───┼────────────────────────────────────────────────┼────────────────────┼──────────┼───────┼─────')

  const totalEnRangos = previewResults.reduce((s, r) => s + r.actual, 0)
  const totalEsperado = previewResults.reduce((s, r) => s + r.esperado, 0)
  const totalDiff = totalEnRangos - totalEsperado
  console.log(`  ${''.padStart(2)} | ${'TOTAL'.padEnd(44)} | ${''.padEnd(18)} | ${String(totalEsperado).padStart(6)}   | ${String(totalEnRangos).padStart(5)}  | ${(totalDiff > 0 ? '+' : '') + totalDiff}`)
  console.log('')

  // ── 3. Preguntas fuera de rango ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  3. PREGUNTAS FUERA DE RANGO')
  console.log('═══════════════════════════════════════════════════════════\n')

  if (fueraDeRango.length === 0) {
    console.log('  ✅ Todas las preguntas caen dentro de los rangos oficiales.\n')
  } else {
    console.log(`  Total fuera de rango: ${fueraDeRango.length}\n`)
    console.log('  Muestra (primeros 30):')
    for (const p of fueraDeRango.slice(0, 30)) {
      console.log(`    ID ${String(p.id).padStart(5)} | # ${String(p.numero).padStart(4)} | código ${String(p.codigo || 'NULL').padStart(8)}`)
    }
    if (fueraDeRango.length > 30) {
      console.log(`    ... y ${fueraDeRango.length - 30} más`)
    }
    console.log('')
  }

  // ── 4. Preguntas sin código ──
  if (sinCodigo.length > 0) {
    console.log(`  ⚠️  Preguntas sin código: ${sinCodigo.length}`)
    for (const p of sinCodigo.slice(0, 10)) {
      console.log(`    ID ${p.id} | # ${p.numero}`)
    }
    console.log('')
  }

  // ── 5. Discrepancias significativas ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  4. DISCREPANCIAS vs NÚMERO OFICIAL ESPERADO')
  console.log('═══════════════════════════════════════════════════════════\n')

  const discrepancias = previewResults.filter(r => r.diff !== 0)
  if (discrepancias.length === 0) {
    console.log('  ✅ Sin discrepancias. Todos los conteos coinciden.\n')
  } else {
    console.log(`  Temas con discrepancia: ${discrepancias.length}\n`)
    for (const r of discrepancias) {
      const icon = r.diff > 0 ? '📈' : '📉'
      console.log(`  ${icon} ${r.nombre.substring(0, 55)}`)
      console.log(`     Esperado: ${r.esperado} | En DB: ${r.actual} | Diferencia: ${r.diffStr}`)
      console.log('')
    }
  }

  // ── 6. Resumen ──
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  5. RESUMEN DEL PREVIEW')
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log(`  Total preguntas en DB:              ${preguntas.length}`)
  console.log(`  Total en rangos oficiales:          ${totalEnRangos}`)
  console.log(`  Total fuera de rango:               ${fueraDeRango.length}`)
  console.log(`  Total preguntas sin código:         ${sinCodigo.length}`)
  console.log(`  Total esperado (oficial):           ${totalEsperado}`)
  console.log(`  Discrepancia total:                 ${totalDiff > 0 ? '+' : ''}${totalDiff}`)
  console.log('')
  console.log('  ACCIONES A REALIZAR:')
  console.log(`  1. Crear tabla materias con ${MATERIAS_OFICIALES.length} temas oficiales`)
  console.log(`  2. Agregar columna materia_id a preguntas`)
  console.log(`  3. Ejecutar UPDATE de materia_id basado en código`)
  console.log(`  4. Preguntas fuera de rango quedarán con materia_id = NULL`)
  console.log(`  5. Simplificar classifyQuestion() en TypeScript`)
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  FIN DEL DIAGNÓSTICO')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
