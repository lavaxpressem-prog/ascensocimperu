-- ============================================================
-- Migration 00014: Storage bucket noticias-pdf
-- ============================================================
-- Configura el bucket de Storage para PDFs de noticias.
--
-- IMPORTANTE: El bucket "noticias-pdf" debe crearse primero
-- desde el Dashboard de Supabase:
--   Storage > New Bucket > nombre: "noticias-pdf" > Public: ON
--
-- Las policies de abajo se ejecutan después de crear el bucket.
-- ============================================================

-- Policy: lectura pública del bucket noticias-pdf
CREATE POLICY "Public read noticias-pdf"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'noticias-pdf');

-- Policy: solo usuarios autenticados pueden subir archivos
CREATE POLICY "Authenticated insert noticias-pdf"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'noticias-pdf'
    AND auth.role() = 'authenticated'
  );

-- Policy: solo usuarios autenticados pueden actualizar archivos
CREATE POLICY "Authenticated update noticias-pdf"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'noticias-pdf'
    AND auth.role() = 'authenticated'
  );

-- Policy: solo usuarios autenticados pueden eliminar archivos
CREATE POLICY "Authenticated delete noticias-pdf"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'noticias-pdf'
    AND auth.role() = 'authenticated'
  );
