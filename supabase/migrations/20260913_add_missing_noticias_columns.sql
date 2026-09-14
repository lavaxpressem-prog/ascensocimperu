-- ============================================================
-- MIGRATION: COMPLETAR TABLA noticias
-- Admin CRUD + Google Drive
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COLUMNAS DEL ADMIN
-- ============================================================

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS is_pdf_public BOOLEAN DEFAULT false;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS uploaded_by UUID;

-- ============================================================
-- 2. GOOGLE DRIVE
-- ============================================================

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS google_drive_view_url TEXT;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS google_drive_download_url TEXT;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS pdf_name TEXT;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS pdf_mime_type TEXT;

ALTER TABLE public.noticias
ADD COLUMN IF NOT EXISTS pdf_size BIGINT;

-- ============================================================
-- 3. VALORES POR DEFECTO
-- ============================================================

UPDATE public.noticias
SET status = 'draft'
WHERE status IS NULL;

UPDATE public.noticias
SET is_pdf_public = false
WHERE is_pdf_public IS NULL;

UPDATE public.noticias
SET sort_order = 0
WHERE sort_order IS NULL;

-- ============================================================
-- 4. VALIDAR STATUS
-- ============================================================

ALTER TABLE public.noticias
DROP CONSTRAINT IF EXISTS noticias_status_check;

ALTER TABLE public.noticias
ADD CONSTRAINT noticias_status_check
CHECK (
    status IN ('draft', 'published', 'archived')
);

-- ============================================================
-- 5. FECHA DE PUBLICACIÓN
-- ============================================================

UPDATE public.noticias
SET published_at = COALESCE(published_at, fecha_publicacion)
WHERE status = 'published'
AND published_at IS NULL;

-- ============================================================
-- 6. FUNCIÓN PARA SABER SI EL USUARIO ES ADMIN
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
$$;

-- ============================================================
-- 7. PERMISOS DE LA FUNCIÓN
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_admin()
TO authenticated;

-- ============================================================
-- 8. RLS
-- ============================================================

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores que pueden interferir
DROP POLICY IF EXISTS "Allow authenticated insert noticias"
ON public.noticias;

DROP POLICY IF EXISTS "Allow authenticated update noticias"
ON public.noticias;

DROP POLICY IF EXISTS "Allow authenticated delete noticias"
ON public.noticias;

DROP POLICY IF EXISTS "Allow public read noticias"
ON public.noticias;

DROP POLICY IF EXISTS "Admin insert noticias"
ON public.noticias;

DROP POLICY IF EXISTS "Admin update noticias"
ON public.noticias;

DROP POLICY IF EXISTS "Admin delete noticias"
ON public.noticias;

-- ============================================================
-- 9. LECTURA PÚBLICA
-- ============================================================

CREATE POLICY "Allow public read noticias"
ON public.noticias
FOR SELECT
USING (true);

-- ============================================================
-- 10. INSERTAR SOLO ADMIN
-- ============================================================

CREATE POLICY "Admin insert noticias"
ON public.noticias
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
);

-- ============================================================
-- 11. ACTUALIZAR SOLO ADMIN
-- ============================================================

CREATE POLICY "Admin update noticias"
ON public.noticias
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
)
WITH CHECK (
    public.is_admin()
);

-- ============================================================
-- 12. ELIMINAR SOLO ADMIN
-- ============================================================

CREATE POLICY "Admin delete noticias"
ON public.noticias
FOR DELETE
TO authenticated
USING (
    public.is_admin()
);

-- ============================================================
-- 13. UPDATED_AT AUTOMÁTICO
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

DROP TRIGGER IF EXISTS trigger_noticias_updated_at
ON public.noticias;

CREATE TRIGGER trigger_noticias_updated_at
BEFORE UPDATE ON public.noticias
FOR EACH ROW
EXECUTE FUNCTION public.update_noticias_updated_at();

COMMIT;