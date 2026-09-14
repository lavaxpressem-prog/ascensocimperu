-- ============================================================
-- Migration: Add missing columns to noticias table
-- Required by the admin panel CRUD and Google Drive integration
-- ============================================================

-- summary (resumen de la noticia)
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS summary TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- status (draft, published, archived)
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- published_at (fecha/hora de publicacion)
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- updated_at (ultima actualizacion)
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- is_pdf_public (si el PDF es accesible publicamente)
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS is_pdf_public BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- sort_order (orden de visualizacion)
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- uploaded_by (UUID del admin que subio la noticia)
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS uploaded_by UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Google Drive integration columns
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS google_drive_view_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS google_drive_download_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS pdf_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS pdf_mime_type TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS pdf_size BIGINT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Set default status for existing rows that have NULL status
UPDATE public.noticias SET status = 'draft' WHERE status IS NULL;

-- Ensure is_published is consistent with status
UPDATE public.noticias SET is_published = true WHERE status = 'published';
UPDATE public.noticias SET is_published = false WHERE status != 'published' OR is_published IS NULL;

-- ============================================================
-- RLS Policies: Only admins can modify noticias
-- ============================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated insert noticias" ON public.noticias;
DROP POLICY IF EXISTS "Allow authenticated update noticias" ON public.noticias;
DROP POLICY IF EXISTS "Allow authenticated delete noticias" ON public.noticias;

-- Admin-only policies using a helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Anyone can read (public page)
CREATE POLICY "Allow public read noticias"
  ON public.noticias FOR SELECT USING (true);

-- Only admins can insert
CREATE POLICY "Admin insert noticias"
  ON public.noticias FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can update
CREATE POLICY "Admin update noticias"
  ON public.noticias FOR UPDATE
  USING (public.is_admin());

-- Only admins can delete
CREATE POLICY "Admin delete noticias"
  ON public.noticias FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_noticias_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_noticias_updated_at ON public.noticias;
CREATE TRIGGER trigger_noticias_updated_at
  BEFORE UPDATE ON public.noticias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_noticias_updated_at();
