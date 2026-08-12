-- ============================================================
-- Migration 00020: Fix Storage Upload
-- ============================================================
-- Crea el bucket "noticias-pdf" si no existe y asegura que
-- sea publico para que las URLs publicas funcionen.
-- ============================================================

-- Crear bucket "noticias-pdf" si no existe (publico)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'noticias-pdf',
  'noticias-pdf',
  true,
  52428800,  -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- ============================================================
-- Policies (idempotent: drop if exists, then recreate)
-- ============================================================

-- Eliminar policies existentes si las hay
DROP POLICY IF EXISTS "Public read noticias-pdf" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert noticias-pdf" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update noticias-pdf" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete noticias-pdf" ON storage.objects;

-- Policy: lectura publica
CREATE POLICY "Public read noticias-pdf"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'noticias-pdf');

-- Policy: usuarios autenticados pueden subir
CREATE POLICY "Authenticated insert noticias-pdf"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'noticias-pdf'
    AND auth.role() = 'authenticated'
  );

-- Policy: usuarios autenticados pueden actualizar
CREATE POLICY "Authenticated update noticias-pdf"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'noticias-pdf'
    AND auth.role() = 'authenticated'
  );

-- Policy: usuarios autenticados pueden eliminar
CREATE POLICY "Authenticated delete noticias-pdf"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'noticias-pdf'
    AND auth.role() = 'authenticated'
  );
