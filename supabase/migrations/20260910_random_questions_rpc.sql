-- ============================================================
-- Migracion: Funcion RPC para seleccion aleatoria de preguntas
-- AscensoCIM Peru - Banco de Preguntas
-- ============================================================
-- Crea una funcion PostgreSQL que selecciona N preguntas
-- aleatorias de la tabla preguntas sin cargar todas al cliente.
-- Esto garantiza eficiencia y verdadera aleatoriedad.

CREATE OR REPLACE FUNCTION get_random_questions(count INTEGER DEFAULT 100)
RETURNS SETOF preguntas
LANGUAGE sql
VOLATILE
PARALLEL SAFE
AS $$
  SELECT *
  FROM preguntas
  ORDER BY RANDOM()
  LIMIT count;
$$;

-- Comentario de la funcion
COMMENT ON FUNCTION get_random_questions(INTEGER) IS
  'Selecciona N preguntas aleatorias del banco de preguntas. Usado por el modulo Banco de Preguntas para mostrar 100 preguntas por sesion.';
