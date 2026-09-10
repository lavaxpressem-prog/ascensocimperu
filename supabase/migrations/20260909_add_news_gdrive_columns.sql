-- ============================================================
-- MIGRACION CORRECTIVA: Noticias + Google Drive
-- Fecha: 2026-09-09 (revision 2)
-- Descripcion: Migracion idempotente y segura que extiende la
--              tabla noticias para soportar Google Drive y un
--              sistema de publicacion basado en status.
--
-- COMPATIBLE CON:
--   - Estructura original de 00013 (8 columnas base)
--   - Extensiones de 00015 (imagen_url, is_published, autor)
--   - Tabla noticias_guardadas (FK a noticias.id)
--   - Frontend AdminNewsPage (usa status)
--   - Frontend TemariosPage (usa status + fallback is_published)
--   - API routes (dual-write status + is_published)
--
-- NO MODIFICA:
--   - Columna 'estado' (uso legal Vigente/Nueva/Modificada)
--   - Columna 'pdf_url' (legacy, se mantiene por compatibilidad)
--   - Datos existentes (solo agrega o sincroniza, nunca elimina)
-- ============================================================

-- ============================================================
-- FASE 1: AGREGAR COLUMNAS QUE PODRIAN NO EXISTIR
-- Cada operacion esta protegida con DO/BLOCK + exception
-- handling para tolerar cualquier estado previo de la tabla.
-- ============================================================

-- Columnas de 00015 que podrian no existir si 00015 no se ejecuto
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS imagen_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS autor TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Columnas nuevas para Google Drive
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS google_drive_view_url TEXT;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS google_drive_download_url TEXT;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS pdf_name TEXT;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS pdf_mime_type TEXT;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS pdf_size BIGINT;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS is_pdf_public BOOLEAN DEFAULT false;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS summary TEXT;

-- ============================================================
-- FASE 2: AGREGAR COLUMNA status
-- TEXT DEFAULT 'draft'. Compatible con los valores usados por
-- el frontend: 'draft', 'published', 'archived'.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- ============================================================
-- FASE 3: MIGRAR DATOS
-- Estrategia:
--   A) Si is_published EXISTE → derivar status desde is_published
--   B) Si is_published NO EXISTE → marcar como 'draft' (seguro)
--
-- IMPORTANTE:
--   - 'estado' NO se toca (es la columna legal Vigente/Nueva/etc)
--   - 'pdf_url' NO se toca (legacy, se mantiene)
--   - Se sincroniza is_published <-> status para dual-write
-- ============================================================

DO $$
DECLARE
  has_is_published boolean;
  has_status boolean;
BEGIN
  -- Verificar si la columna is_published existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'noticias'
    AND column_name = 'is_published'
  ) INTO has_is_published;

  -- Verificar si la columna status existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'noticias'
    AND column_name = 'status'
  ) INTO has_status;

  -- Solo migrar datos si AMBAS columnas existen
  IF has_is_published AND has_status THEN
    -- Caso 1: is_published=true → status='published'
    UPDATE public.noticias
    SET status = 'published',
        published_at = COALESCE(published_at, created_at)
    WHERE is_published = true
      AND (status IS NULL OR status != 'published');

    -- Caso 2: is_published=false → status='draft'
    UPDATE public.noticias
    SET status = 'draft'
    WHERE is_published = false
      AND (status IS NULL OR status = 'published');

    -- Sincronizar is_published hacia status para filas huérfanas
    UPDATE public.noticias
    SET is_published = (status = 'published')
    WHERE status IS NOT NULL
      AND is_published IS DISTINCT FROM (status = 'published');

  ELSIF has_status AND NOT has_is_published THEN
    -- is_published no existe: marcar todo como 'draft' (seguro)
    -- Razon: la política RLS nueva restringe no-admins a
    -- status='published'. Si publicamos todo, los usuarios
    -- verían noticias que quizás no deberían.
    UPDATE public.noticias
    SET status = 'draft'
    WHERE status IS NULL;

  ELSIF has_is_published AND NOT has_status THEN
    -- status no existe pero is_published sí:
    -- No podemos migrar sin status. Solo establecer published_at.
    UPDATE public.noticias
    SET published_at = created_at
    WHERE published_at IS NULL;
  END IF;

  -- Asegurar published_at para todas las noticias publicadas
  IF has_status THEN
    UPDATE public.noticias
    SET published_at = COALESCE(published_at, created_at)
    WHERE status = 'published'
      AND published_at IS NULL;
  END IF;
END $$;

-- ============================================================
-- FASE 4: INDICES
-- Todos usan IF NOT EXISTS para idempotencia.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_noticias_status ON public.noticias(status);
CREATE INDEX IF NOT EXISTS idx_noticias_published_at ON public.noticias(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_categoria ON public.noticias(categoria);
CREATE INDEX IF NOT EXISTS idx_noticias_sort_order ON public.noticias(sort_order);

-- ============================================================
-- FASE 5: RLS
-- Elimina políticas antiguas (cualquier autenticado podía todo)
-- y reemplaza con políticas basadas en role + status.
--
-- VERIFICACIÓN de profiles.role:
--   Tabla profiles (00001_schema.sql línea 27):
--   role text NOT NULL DEFAULT 'user'
--   CHECK (role IN ('admin', 'user', 'supervisor'))
--   La consulta auth.uid() IN (SELECT id FROM profiles WHERE role='admin')
--   es compatible con esta estructura.
-- ============================================================

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas de 00013 (si existen)
DROP POLICY IF EXISTS "Allow public read noticias" ON public.noticias;
DROP POLICY IF EXISTS "Allow authenticated insert noticias" ON public.noticias;
DROP POLICY IF EXISTS "Allow authenticated update noticias" ON public.noticias;
DROP POLICY IF EXISTS "Allow authenticated delete noticias" ON public.noticias;

-- Eliminar políticas nuevas (para re-ejecución idempotente)
DROP POLICY IF EXISTS "noticias_select_published" ON public.noticias;
DROP POLICY IF EXISTS "noticias_insert_admin" ON public.noticias;
DROP POLICY IF EXISTS "noticias_update_admin" ON public.noticias;
DROP POLICY IF EXISTS "noticias_delete_admin" ON public.noticias;

-- SELECT: usuarios autenticados leen publicadas, admins leen todo
CREATE POLICY "noticias_select_published" ON public.noticias
  FOR SELECT
  USING (
    status = 'published'
    OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- INSERT: solo admins
CREATE POLICY "noticias_insert_admin" ON public.noticias
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- UPDATE: solo admins
CREATE POLICY "noticias_update_admin" ON public.noticias
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- DELETE: solo admins
CREATE POLICY "noticias_delete_admin" ON public.noticias
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- ============================================================
-- FASE 6: TRIGGER updated_at
-- Función y trigger idempotentes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_noticias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_noticias_updated_at ON public.noticias;
CREATE TRIGGER trigger_noticias_updated_at
  BEFORE UPDATE ON public.noticias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_noticias_updated_at();

-- ============================================================
-- FASE 7: VISTA noticias_stats
-- Todas las columnas referenciadas (status, google_drive_file_id,
-- is_pdf_public) existen tras las fases 1-2.
-- ============================================================

CREATE OR REPLACE VIEW public.noticias_stats AS
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'draft') as drafts,
  COUNT(*) FILTER (WHERE status = 'published') as published,
  COUNT(*) FILTER (WHERE status = 'archived') as archived,
  COUNT(*) FILTER (WHERE google_drive_file_id IS NOT NULL) as with_pdf,
  COUNT(*) FILTER (WHERE is_pdf_public = true) as public_pdfs
FROM public.noticias;

-- ============================================================
-- FASE 8: FUNCIÓN get_admin_stats()
-- SOLAMENTE se reemplaza si las tablas dependientes existen.
-- Si uploaded_files o activity_logs no existen, se omite
-- para no romper la función existente.
-- ============================================================

DO $$
DECLARE
  has_uploaded_files boolean;
  has_activity_logs boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'uploaded_files'
  ) INTO has_uploaded_files;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) INTO has_activity_logs;

  IF has_uploaded_files AND has_activity_logs THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.get_admin_stats()
    RETURNS TABLE (
      total_users bigint,
      active_users bigint,
      pending_users bigint,
      locked_users bigint,
      total_questions bigint,
      total_noticias bigint,
      published_noticias bigint,
      total_files bigint,
      total_logins bigint,
      recent_activity bigint
    ) LANGUAGE sql SECURITY DEFINER AS $$
      SELECT
        (SELECT COUNT(*) FROM public.profiles) AS total_users,
        (SELECT COUNT(*) FROM public.profiles WHERE status = ''approved'') AS active_users,
        (SELECT COUNT(*) FROM public.profiles WHERE status = ''pending'') AS pending_users,
        (SELECT COUNT(*) FROM public.profiles WHERE status = ''locked'' OR status = ''suspended'') AS locked_users,
        (SELECT COUNT(*) FROM public.preguntas) AS total_questions,
        (SELECT COUNT(*) FROM public.noticias) AS total_noticias,
        (SELECT COUNT(*) FROM public.noticias WHERE status = ''published'') AS published_noticias,
        (SELECT COUNT(*) FROM public.uploaded_files) AS total_files,
        (SELECT COUNT(*) FROM public.profiles WHERE last_login IS NOT NULL) AS total_logins,
        (SELECT COUNT(*) FROM public.activity_logs WHERE created_at > now() - interval ''7 days'') AS recent_activity;
    $$;
    ';
  END IF;
END $$;
