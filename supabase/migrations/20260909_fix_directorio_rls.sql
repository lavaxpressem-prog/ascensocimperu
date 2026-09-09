-- ============================================================
-- Fix: Asegurar acceso al Directorio Telefónico para todos los usuarios autenticados
-- Política RLS más robusta usando auth.uid() en lugar de auth.role()
-- ============================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Authenticated users can read comisarias_nacional" ON public.comisarias_nacional;
DROP POLICY IF EXISTS "Authenticated users can read comisarias" ON public.comisarias_pnp;

-- Recrear política para comisarias_nacional (más robusta)
CREATE POLICY "Authenticated users can read comisarias_nacional"
  ON public.comisarias_nacional FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Recrear política para comisarias_pnp si la tabla existe (más robusta)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comisarias_pnp') THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read comisarias" ON public.comisarias_pnp FOR SELECT USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;
