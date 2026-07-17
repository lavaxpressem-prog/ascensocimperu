-- ============================================================
-- AscensoCIM Peru - Migración 00016: Reclasificación de preguntas
-- Fecha: 2026-07-17
-- Descripción:
--   1. Crea la tabla `materias` con los 22 temas oficiales PNP 2026-2027
--   2. Agrega la columna `materia_id` a la tabla `preguntas`
--   3. Actualiza `materia_id` basado en rangos de código
--   4. Configura RLS e índices
--
-- REPRODUCIBLE: Este script puede ejecutarse múltiples veces sin errores.
-- Usa IF NOT EXISTS y ON CONFLICT para ser idempotente.
--
-- BACKUP: Se creó previamente backup_preguntas_<timestamp>.json
-- ============================================================

-- ============================================================
-- PASO 1: Crear tabla materias (si no existe)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.materias (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL
);

-- Poblar materias con los 22 temas oficiales (ignorar si ya existen)
INSERT INTO public.materias (id, nombre) VALUES
  (1,  'CONSTITUCIÓN POLÍTICA DEL PERÚ (TEXTO ACTUALIZADO INCLUIDO SUS MODIFICATORIAS LEY 31988 DEL 20MAY2024).'),
  (2,  'DECLARACIÓN UNIVERSAL DE LOS DERECHOS HUMANOS'),
  (3,  'LEY DE LA PNP - DECRETO LEGISLATIVO N° 1267 Y SUS MODIFICATORIAS (DECRETO LEGISLATIVO 1318 Y DECRETO LEGISLATIVO N°1451)'),
  (4,  'DECRETO LEGISLATIVO N°1149 - LEY DE LA CARRERA Y SITUACIÓN DEL PERSONAL PNP Y SU MODIFICATORIA, D.L. N°1230, D.L. N°242, LEY 30686 Y LEY N° 31379 (NO INCLUYE ANEXOS I,II Y III)'),
  (5,  'DECRETO LEGISLATIVO N°1291 - LEY DE LUCHA CONTRA LA CORRUPCIÓN EN EL SECTOR INTERIOR Y SU REGLAMENTO DECRETO SUPREMO N°013-17-IN. (MODIFICADO POR EL D.S. N°001-2019-IN)'),
  (6,  'LEY Nº 30714 - LEY DE RÉGIMEN DISCIPLINARIO DE LA POLICIA NACIONAL DEL PERÚ'),
  (7,  'DECRETO LEGISLATIVO N° 1318 - LEY QUE REGULA LA FORMACIÓN PROFESIONAL DE LA POLICÍA NACIONAL DEL PERÚ'),
  (8,  'TUO de la Ley 27806 "Ley de Trasparencia y Acceso a la Información Pública" (DS. 021-2019-JUS)'),
  (9,  'LEY QUE REGULA LOS PROCESOS DE ASCENSOS DEL PERSONAL DE LA POLICÍA NACIONAL DEL PERÚ'),
  (10, 'LEY 27444 - LEY DEL PROCEDIMIENTO ADMINISTRATIVO GENERAL'),
  (11, 'DECRETO LEGISLATIVO Nº 957 CÓDIGO PROCESAL PENAL Y SUS MODIFICATORIAS HASTA 31MAR2023'),
  (12, 'DECRETO LEGISLATIVO Nº 635 CÓDIGO PENAL Y SUS MODIFICATORIAS (NO INCLUYE PENAS)'),
  (13, 'DECRETO LEGISLATIVO Nº 1186 LEY QUE REGULA EL USO DE LA FUERZA POR PARTE DE LA PNP, SUS MODIFICATORIAS Y SU REGLAMENTO DS. N°012-2016-IN'),
  (14, 'DECRETO LEGISLATIVO Nº 1241 QUE FORTALECE LA LUCHA CONTRA EL TRAFICO ILÍCITO DE DROGAS'),
  (15, 'DECRETO LEGISLATIVO Nº 1106 - LUCHA EFICAZ CONTRA EL LAVADO DE ACTIVOS Y OTROS DELITOS RELACIONADOS A LA MINERIA ILEGAL Y CRIMEN ORGANIZADO Y SUS MODIFICATORIAS'),
  (16, 'LEY Nº 30364 LEY PARA PREVENIR, SANCIONAR Y ERRADICAR LA VIOLENCIA CONTRA LAS MUJERES Y LOS INTEGRANTES DEL GRUPO FAMILIAR Y SUS MODIFICATORIAS'),
  (17, 'LEY Nº 30077 - CONTRA EL CRIMEN ORGANIZADO Y SUS MODIFICATORIAS (DL Nº 1244) AL 31MAR2023'),
  (18, 'DECRETO SUPREMO N° 009- 2018-JUS - PROTOCOLOS DE ACTUACIÓN LNTERINSTITUCIONAL ESPECIFICO PARA LA APLICACION DEL PROCESO INMEDIATO REFORMADO Y EL DS N°010-2018-JUS -PROTOCOLOS DE ACTUACIÓN INTERINSTITUCIONAL DE CARACTER SISTEMICO Y TRANSVERSAL PARA LA APLICACIÓN DEL CÓDIGO PROCESAL PENAL'),
  (19, 'LEY 32130 - LEY QUE MODIFICA EL CÓDIGO PROCESAL PENAL, D.LEG 957, PARA FORTALECER LA INVESTIGACIÓN DEL DELITO COMO FUNCIÓN DE LA POLICÍA NACIONAL DEL PERÚ Y AGILIZAR LOS PROCESOS PENALES'),
  (20, 'D.LEG 1611 - QUE APRUEBA MEDIDAS ESPECIALES PARA LA PREVENCIÓN E INVESTIGACIÓN DEL DELITO DE EXTORSIÓN Y DELITOS CONEXOS.'),
  (21, 'DDHH APLICADOS A LA FUNCIÓN POLICIAL (RESOLUCIÓN MINISTERIAL N.º 487-2018IN) 2DA PARTE'),
  (22, 'D.LEG. 1428 - QUE DESARROLLA MEDIDAS PARA LA ATENCION DE CASOS DE DESAPARICION DE PERSONAS EN SITUACI0N DE VULNERABILIDAD.')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ============================================================
-- PASO 2: Agregar columna materia_id a preguntas (si no existe)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preguntas'
      AND column_name = 'materia_id'
  ) THEN
    ALTER TABLE public.preguntas ADD COLUMN materia_id INTEGER;
    RAISE NOTICE 'Columna materia_id agregada a preguntas';
  ELSE
    RAISE NOTICE 'Columna materia_id ya existe en preguntas';
  END IF;
END $$;

-- ============================================================
-- PASO 3: Crear respaldo dentro de la DB (tabla temporal)
-- ============================================================

DROP TABLE IF EXISTS public.preguntas_backup_20260716;
CREATE TABLE public.preguntas_backup_20260716 AS
SELECT * FROM public.preguntas;

-- ============================================================
-- PASO 4: Actualizar materia_id basado en rangos de código
-- ============================================================

-- Constitución Política del Perú (180838–181051)
UPDATE public.preguntas
SET materia_id = 1
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 180838 AND 181051;

-- Declaración Universal de los Derechos Humanos (181052–181066)
UPDATE public.preguntas
SET materia_id = 2
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 181052 AND 181066;

-- Ley de la PNP - DL 1267 (181082–181239)
UPDATE public.preguntas
SET materia_id = 3
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 181082 AND 181239;

-- DL 1149 - Carrera y Situación del Personal PNP (181269–181503)
UPDATE public.preguntas
SET materia_id = 4
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 181269 AND 181503;

-- DL 1291 - Lucha contra la Corrupción (181591–181640)
UPDATE public.preguntas
SET materia_id = 5
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 181591 AND 181640;

-- Ley 30714 - Régimen Disciplinario PNP (177928–178127)
UPDATE public.preguntas
SET materia_id = 6
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 177928 AND 178127;

-- DL 1318 - Formación Profesional de la PNP (181504–181544)
UPDATE public.preguntas
SET materia_id = 7
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 181504 AND 181544;

-- TUO Ley 27806 - Transparencia (186276–186355)
UPDATE public.preguntas
SET materia_id = 8
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 186276 AND 186355;

-- Ley Procesos de Ascensos PNP (186694–186772)
UPDATE public.preguntas
SET materia_id = 9
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 186694 AND 186772;

-- Ley 27444 - Procedimiento Administrativo General (181833–181970)
UPDATE public.preguntas
SET materia_id = 10
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 181833 AND 181970;

-- DL 957 - Código Procesal Penal (184328–184505)
UPDATE public.preguntas
SET materia_id = 11
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 184328 AND 184505;

-- DL 635 - Código Penal (183939–184318)
UPDATE public.preguntas
SET materia_id = 12
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 183939 AND 184318;

-- DL 1186 - Uso de la Fuerza por la PNP (184701–184752)
UPDATE public.preguntas
SET materia_id = 13
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 184701 AND 184752;

-- DL 1241 - Tráfico Ilícito de Drogas (184950–184998)
UPDATE public.preguntas
SET materia_id = 14
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 184950 AND 184998;

-- DL 1106 - Lavado de Activos (185046–185162)
UPDATE public.preguntas
SET materia_id = 15
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 185046 AND 185162;

-- Ley 30364 - Violencia contra las Mujeres (185163–185280)
UPDATE public.preguntas
SET materia_id = 16
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 185163 AND 185280;

-- Ley 30077 - Crimen Organizado (185295–185356)
UPDATE public.preguntas
SET materia_id = 17
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 185295 AND 185356;

-- DS 009-2018-JUS - Protocolos de Actuación (185690–185718)
UPDATE public.preguntas
SET materia_id = 18
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 185690 AND 185718;

-- Ley 32130 - Modifica el Código Procesal Penal (184850–184947)
UPDATE public.preguntas
SET materia_id = 19
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 184850 AND 184947;

-- DLeg 1611 - Extorsión (185359–185419)
UPDATE public.preguntas
SET materia_id = 20
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 185359 AND 185419;

-- DDHH Función Policial - RM 487-2018-IN (185988–186062)
UPDATE public.preguntas
SET materia_id = 21
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 185988 AND 186062;

-- DLeg 1428 - Desaparición de Personas (185859–185921)
UPDATE public.preguntas
SET materia_id = 22
WHERE codigo ~ '^\d+$'
  AND CAST(codigo AS INTEGER) BETWEEN 185859 AND 185921;

-- ============================================================
-- PASO 5: Agregar foreign key constraint
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'preguntas'
      AND constraint_name = 'fk_preguntas_materia_id'
  ) THEN
    ALTER TABLE public.preguntas
      ADD CONSTRAINT fk_preguntas_materia_id
      FOREIGN KEY (materia_id) REFERENCES public.materias(id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key constraint agregado';
  ELSE
    RAISE NOTICE 'Foreign key constraint ya existe';
  END IF;
END $$;

-- ============================================================
-- PASO 6: Crear índices para materias_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_preguntas_materia_id ON public.preguntas(materia_id);

-- ============================================================
-- PASO 7: Configurar RLS para tabla materias
-- ============================================================

ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer materias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'materias'
      AND policyname = 'Authenticated users can read materias'
  ) THEN
    CREATE POLICY "Authenticated users can read materias"
      ON public.materias FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Anónimos también pueden leer (para exámenes públicos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'materias'
      AND policyname = 'Anonymous users can read materias'
  ) THEN
    CREATE POLICY "Anonymous users can read materias"
      ON public.materias FOR SELECT
      USING (true);
  END IF;
END $$;

-- Solo admins pueden modificar materias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'materias'
      AND policyname = 'Admins can manage materias'
  ) THEN
    CREATE POLICY "Admins can manage materias"
      ON public.materias FOR ALL
      USING (exists (
        select 1 from public.profiles where id = auth.uid() and role = 'admin'
      ));
  END IF;
END $$;

-- ============================================================
-- PASO 8: Verificación (opcional - para debug)
-- ============================================================

-- Mostrar conteo por materia_id después de la actualización
DO $$
DECLARE
  total_preguntas INTEGER;
  total_con_materia INTEGER;
  total_sin_materia INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_preguntas FROM public.preguntas;
  SELECT COUNT(*) INTO total_con_materia FROM public.preguntas WHERE materia_id IS NOT NULL;
  SELECT COUNT(*) INTO total_sin_materia FROM public.preguntas WHERE materia_id IS NULL;

  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '  VERIFICACIÓN DE MIGRACIÓN 00016';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '  Total preguntas: %', total_preguntas;
  RAISE NOTICE '  Con materia_id: %', total_con_materia;
  RAISE NOTICE '  Sin materia_id: %', total_sin_materia;
  RAISE NOTICE '══════════════════════════════════════════════════════';
END $$;

-- ============================================================
-- FIN DE MIGRACIÓN 00016
-- ============================================================
