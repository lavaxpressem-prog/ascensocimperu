-- ============================================================
-- Migration 00017: RLS for comisarias_pnp (Directorio Telefónico)
-- ============================================================

-- Enable RLS
ALTER TABLE public.comisarias_pnp ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (directorio is public for all officers)
CREATE POLICY "Authenticated users can read comisarias"
  ON public.comisarias_pnp FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify
CREATE POLICY "Admins can manage comisarias"
  ON public.comisarias_pnp FOR ALL
  USING (exists (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));
