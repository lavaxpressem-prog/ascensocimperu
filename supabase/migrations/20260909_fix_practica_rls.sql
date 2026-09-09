-- ============================================================
-- Fix: Asegurar acceso a Práctica por Temas para todos los usuarios autenticados
-- Política RLS más robusta usando auth.uid() en lugar de auth.role()
-- ============================================================

-- Materias: actualizar política SELECT
DROP POLICY IF EXISTS "Authenticated users can read materias" ON public.materias;
CREATE POLICY "Authenticated users can read materias"
  ON public.materias FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Preguntas: actualizar política SELECT
DROP POLICY IF EXISTS "Authenticated users can read preguntas" ON public.preguntas;
CREATE POLICY "Authenticated users can read preguntas"
  ON public.preguntas FOR SELECT
  USING (auth.uid() IS NOT NULL);
