-- =============================================================
-- AscensoCIM Peru - Migracion 00011: RLS para tabla preguntas
-- =============================================================
-- Habilita RLS en la tabla preguntas y crea policies de acceso.
-- Ejecutar en Supabase SQL Editor despues de banco_preguntas_supabase.sql

-- Habilitar RLS
ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer todas las preguntas
CREATE POLICY "Authenticated users can read preguntas"
  ON public.preguntas FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anonymous users can also read (for public exam/audio pages)
CREATE POLICY "Anonymous users can read preguntas"
  ON public.preguntas FOR SELECT
  USING (true);

-- Admins pueden gestionar preguntas (insert, update, delete)
CREATE POLICY "Admins can insert preguntas"
  ON public.preguntas FOR INSERT
  WITH CHECK (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

CREATE POLICY "Admins can update preguntas"
  ON public.preguntas FOR UPDATE
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

CREATE POLICY "Admins can delete preguntas"
  ON public.preguntas FOR DELETE
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));
