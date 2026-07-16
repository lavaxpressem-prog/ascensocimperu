-- ============================================================
-- Migration 00015: Admin Panel Tables
-- ============================================================
-- Tablas adicionales para el Panel de Administracion completo.

-- ============================================================
-- 1. SYSTEM CONFIG (Configuracion del sistema)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key  TEXT NOT NULL UNIQUE,
  config_value TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES public.profiles(id)
);

-- Datos iniciales de configuracion
INSERT INTO public.system_config (config_key, config_value, category, description) VALUES
  ('system_name', 'AscensoCIM Perú', 'general', 'Nombre del sistema'),
  ('whatsapp_number', '900648150', 'contact', 'Numero de WhatsApp'),
  ('contact_email', 'admin@ascensocim.com', 'contact', 'Correo de contacto'),
  ('footer_text', 'Plataforma de estudio para el ascenso en la PNP', 'general', 'Texto del pie de pagina'),
  ('enable_registration', 'true', 'general', 'Permitir registro de usuarios'),
  ('enable_ai', 'true', 'modules', 'Habilitar modulo de IA'),
  ('enable_audio', 'true', 'modules', 'Habilitar modulo de audio')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- 2. ADMIN AUDIT LOG (Registro de acciones del administrador)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer logs de auditoria
CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_admin());

-- Solo admins pueden insertar logs de auditoria
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_log(action);

-- ============================================================
-- 3. UPLOADED FILES (Archivos subidos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     INTEGER,
  folder        TEXT NOT NULL DEFAULT 'general',
  uploaded_by   UUID REFERENCES public.profiles(id),
  is_public     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Admins pueden gestionar archivos
CREATE POLICY "Admins can read all files"
  ON public.uploaded_files FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert files"
  ON public.uploaded_files FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete files"
  ON public.uploaded_files FOR DELETE
  USING (public.is_admin());

-- Usuarios autenticados pueden leer archivos publicos
CREATE POLICY "Authenticated users can read public files"
  ON public.uploaded_files FOR SELECT
  USING (is_public = true AND auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_uploaded_files_folder ON public.uploaded_files(folder);

-- ============================================================
-- 4. Module active status (Estado activo/inactivo de modulos)
-- ============================================================
-- Agregar columna is_active a modules si no existe
DO $$ BEGIN
  ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 5. Noticias enhancements (Mejoras a noticias)
-- ============================================================
-- Agregar columnas adicionales a noticias si no existen
DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS imagen_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS autor TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 6. RPC Functions for Admin Panel
-- ============================================================

-- Funcion para obtener estadisticas del admin
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
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'approved') AS active_users,
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'pending') AS pending_users,
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'locked' OR status = 'suspended') AS locked_users,
    (SELECT COUNT(*) FROM public.preguntas) AS total_questions,
    (SELECT COUNT(*) FROM public.noticias) AS total_noticias,
    (SELECT COUNT(*) FROM public.noticias WHERE is_published = true) AS published_noticias,
    (SELECT COUNT(*) FROM public.uploaded_files) AS total_files,
    (SELECT COUNT(*) FROM public.profiles WHERE last_login IS NOT NULL) AS total_logins,
    (SELECT COUNT(*) FROM public.activity_logs WHERE created_at > now() - interval '7 days') AS recent_activity;
$$;

-- Funcion para obtener actividad reciente
CREATE OR REPLACE FUNCTION public.get_recent_activity(p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  user_email text,
  user_name text,
  action text,
  details jsonb,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    al.id,
    p.email AS user_email,
    p.name AS user_name,
    al.action,
    al.details,
    al.created_at
  FROM public.activity_logs al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
$$;

-- Funcion para registrar audit log del admin
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- Funcion para bloquear/desbloquear usuario
CREATE OR REPLACE FUNCTION public.toggle_user_lock(p_user_id uuid, p_lock boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET status = CASE WHEN p_lock THEN 'locked'::user_status ELSE 'approved'::user_status END,
      locked_until = CASE WHEN p_lock THEN now() + interval '30 days' ELSE null END
  WHERE id = p_user_id;
$$;

-- Funcion para cambiar rol de usuario
CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
$$;

-- ============================================================
-- 7. RLS for system_config
-- ============================================================
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read system config"
  ON public.system_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update system config"
  ON public.system_config FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert system config"
  ON public.system_config FOR INSERT
  WITH CHECK (public.is_admin());
