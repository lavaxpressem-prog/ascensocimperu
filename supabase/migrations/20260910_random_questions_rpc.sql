-- ============================================================
-- MIGRATION: Funcion RPC para seleccion aleatoria de preguntas
-- AscensoCIM Peru - Banco de Preguntas
-- ============================================================
-- Esta migracion crea (o reemplaza) la funcion PostgreSQL
-- get_random_questions que selecciona N preguntas aleatorias
-- de la tabla preguntas directamente en el servidor.
--
-- VENTAJAS:
--   - Solo transfiere 100 filas al cliente (no 1500)
--   - PostgreSQL ejecuta ORDER BY RANDOM() internamente
--   - Verdadera aleatoriedad garantizada por el motor SQL
--   - Sin duplicados (cada fila tiene ID unico)
--   - Compatible con RLS existente
--
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

-- Eliminar la funcion si existe (CREATE OR REPLACE no cambia
-- la firma, asi que la borramos y recreamos por seguridad)
DROP FUNCTION IF EXISTS public.get_random_questions(integer);

-- Crear la funcion
CREATE FUNCTION public.get_random_questions(count integer DEFAULT 100)
RETURNS SETOF public.preguntas
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  -- SELECT * porque la tabla preguntas tiene todas las columnas
  -- que el frontend necesita (id, numero, pregunta, opciones,
  -- respuesta_correcta, indice_correcto, ubicacion, codigo,
  -- materia_id, created_at).
  --
  -- ORDER BY RANDOM() garantiza aleatoriedad real.
  -- PostgreSQL genera valores aleatorios para cada fila y ordena.
  --
  -- LIMIT count restringe el resultado a N filas.
  -- Como cada fila tiene ID unico, no hay duplicados.
  --
  -- RLS se aplica automaticamente: solo se retornan preguntas
  -- que el usuario autenticado tiene permiso de leer.
  SELECT *
  FROM public.preguntas
  ORDER BY RANDOM()
  LIMIT count;
$$;

-- Otorgar permisos de ejecucion a usuarios autenticados y anon
-- (RLS de la tabla preguntas controla que filas son visibles)
GRANT EXECUTE ON FUNCTION public.get_random_questions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_questions(integer) TO anon;

-- Comentario descriptivo
COMMENT ON FUNCTION public.get_random_questions(integer) IS
  'Selecciona N preguntas aleatorias del banco de preguntas. '
  'Usado por el modulo Banco de Preguntas para mostrar 100 preguntas por sesion. '
  'Garantiza aleatoriedad real mediante ORDER BY RANDOM(). '
  'Compatible con RLS: respeta los permisos de lectura de la tabla preguntas.';

-- Verificacion: contar preguntas disponibles
DO $$
BEGIN
  RAISE NOTICE 'Funcion get_random_questions creada correctamente.';
  RAISE NOTICE 'Total de preguntas disponibles: %', (SELECT COUNT(*) FROM public.preguntas);
END $$;
