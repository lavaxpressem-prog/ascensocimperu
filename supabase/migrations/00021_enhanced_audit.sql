-- ============================================================
-- Migration 00021: Enhanced Audit System
-- ============================================================
-- Sistema completo de auditoria y registro de actividades.

-- ============================================================
-- 1. Enhance activity_logs with new columns
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS module TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON public.activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON public.activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin ON public.activity_logs(admin_id);

-- ============================================================
-- 2. USER SESSIONS (Sesiones de usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  login_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at     TIMESTAMPTZ,
  ip_address    TEXT,
  user_agent    TEXT,
  duration_seconds INTEGER,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all sessions"
  ON public.user_sessions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can insert own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login ON public.user_sessions(login_at DESC);

-- ============================================================
-- 3. RPC: Get comprehensive audit logs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  action TEXT,
  module TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT,
  admin_id UUID,
  admin_email TEXT,
  admin_name TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_where TEXT := 'TRUE';
  v_sql TEXT;
  v_count_sql TEXT;
  v_total BIGINT;
BEGIN
  -- Build dynamic WHERE clause
  IF p_from IS NOT NULL THEN
    v_where := v_where || format(' AND al.created_at >= %L', p_from);
  END IF;
  IF p_to IS NOT NULL THEN
    v_where := v_where || format(' AND al.created_at <= %L', p_to);
  END IF;
  IF p_user_id IS NOT NULL THEN
    v_where := v_where || format(' AND al.user_id = %L', p_user_id);
  END IF;
  IF p_action IS NOT NULL AND p_action != '' THEN
    v_where := v_where || format(' AND al.action = %L', p_action);
  END IF;
  IF p_module IS NOT NULL AND p_module != '' THEN
    v_where := v_where || format(' AND al.module = %L', p_module);
  END IF;
  IF p_status IS NOT NULL AND p_status != '' THEN
    v_where := v_where || format(' AND al.status = %L', p_status);
  END IF;
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_where := v_where || format(' AND (p.email ILIKE %L OR p.name ILIKE %L OR al.action ILIKE %L OR al.module ILIKE %L OR al.details::text ILIKE %L)',
      '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%');
  END IF;

  -- Get total count
  v_count_sql := format('SELECT COUNT(*) FROM public.activity_logs al LEFT JOIN public.profiles p ON p.id = al.user_id WHERE %s', v_where);
  EXECUTE v_count_sql INTO v_total;

  -- Get results
  v_sql := format('
    SELECT
      al.id,
      al.user_id,
      p.email AS user_email,
      COALESCE(p.name, p.email) AS user_name,
      p.role AS user_role,
      al.action,
      al.module,
      al.details,
      al.ip_address,
      al.user_agent,
      COALESCE(al.status, ''success'') AS status,
      al.admin_id,
      ap.email AS admin_email,
      COALESCE(ap.name, ap.email) AS admin_name,
      al.created_at,
      %s AS total_count
    FROM public.activity_logs al
    LEFT JOIN public.profiles p ON p.id = al.user_id
    LEFT JOIN public.profiles ap ON ap.id = al.admin_id
    WHERE %s
    ORDER BY al.created_at DESC
    LIMIT %s OFFSET %s
  ', v_total, v_where, p_limit, p_offset);

  RETURN QUERY EXECUTE v_sql;
END;
$$;

-- ============================================================
-- 4. RPC: Get audit stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_audit_stats()
RETURNS TABLE (
  active_users BIGINT,
  logins_24h BIGINT,
  total_actions BIGINT,
  failed_attempts BIGINT,
  active_sessions BIGINT,
  security_events BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'approved') AS active_users,
    (SELECT COUNT(*) FROM public.user_sessions WHERE login_at > now() - interval '24 hours') AS logins_24h,
    (SELECT COUNT(*) FROM public.activity_logs WHERE created_at > now() - interval '30 days') AS total_actions,
    (SELECT COUNT(*) FROM public.activity_logs WHERE status = 'failed' AND created_at > now() - interval '30 days') AS failed_attempts,
    (SELECT COUNT(*) FROM public.user_sessions WHERE is_active = true) AS active_sessions,
    (SELECT COUNT(*) FROM public.activity_logs WHERE (action ILIKE '%fail%' OR action ILIKE '%error%' OR action ILIKE '%unauthorized%') AND created_at > now() - interval '30 days') AS security_events;
$$;

-- ============================================================
-- 5. RPC: Get user sessions
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_sessions(
  p_limit INT DEFAULT 50,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  login_at TIMESTAMPTZ,
  logout_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  duration_seconds INTEGER,
  is_active BOOLEAN,
  total_logins BIGINT,
  total_duration BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_where TEXT := 'TRUE';
  v_sql TEXT;
BEGIN
  IF p_from IS NOT NULL THEN
    v_where := v_where || format(' AND us.login_at >= %L', p_from);
  END IF;
  IF p_to IS NOT NULL THEN
    v_where := v_where || format(' AND us.login_at <= %L', p_to);
  END IF;

  v_sql := format('
    WITH session_stats AS (
      SELECT
        us.id,
        us.user_id,
        p.email AS user_email,
        COALESCE(p.name, p.email) AS user_name,
        p.role AS user_role,
        us.login_at,
        us.logout_at,
        us.ip_address,
        us.user_agent,
        us.duration_seconds,
        us.is_active,
        COUNT(*) OVER (PARTITION BY us.user_id) AS total_logins,
        COALESCE(SUM(us.duration_seconds) OVER (PARTITION BY us.user_id), 0) AS total_duration
      FROM public.user_sessions us
      LEFT JOIN public.profiles p ON p.id = us.user_id
      WHERE %s
      ORDER BY us.login_at DESC
      LIMIT %s
    )
    SELECT * FROM session_stats
  ', v_where, p_limit);

  RETURN QUERY EXECUTE v_sql;
END;
$$;

-- ============================================================
-- 6. RPC: Run manual audit analysis
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_audit_analysis()
RETURNS TABLE (
  category TEXT,
  severity TEXT,
  title TEXT,
  description TEXT,
  count BIGINT,
  details JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Recent activities
  RETURN QUERY
  SELECT
    'activities'::TEXT,
    'normal'::TEXT,
    'Actividades recientes'::TEXT,
    'Resumen de actividades en las ultimas 24 horas'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'actions', jsonb_object_agg(action, cnt)
    )
  FROM (
    SELECT action, COUNT(*) AS cnt
    FROM public.activity_logs
    WHERE created_at > now() - interval '24 hours'
    GROUP BY action
  ) sub;

  -- Most active users
  RETURN QUERY
  SELECT
    'active_users'::TEXT,
    'normal'::TEXT,
    'Usuarios con mayor actividad'::TEXT,
    'Top 5 usuarios mas activos en los ultimos 7 dias'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'users', jsonb_agg(jsonb_build_object('user_id', user_id, 'email', email, 'name', name, 'actions', cnt))
    )
  FROM (
    SELECT al.user_id, p.email, p.name, COUNT(*) AS cnt
    FROM public.activity_logs al
    LEFT JOIN public.profiles p ON p.id = al.user_id
    WHERE al.created_at > now() - interval '7 days'
    GROUP BY al.user_id, p.email, p.name
    ORDER BY cnt DESC
    LIMIT 5
  ) sub;

  -- Failed login attempts
  RETURN QUERY
  SELECT
    'failed_logins'::TEXT,
    CASE WHEN COUNT(*) > 10 THEN 'critical' WHEN COUNT(*) > 5 THEN 'warning' ELSE 'normal' END::TEXT,
    'Intentos de acceso fallidos'::TEXT,
    'Intentos de login fallidos en las ultimas 24 horas'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'attempts', jsonb_agg(jsonb_build_object('email', email, 'ip', ip_address, 'time', attempted_at))
    )
  FROM public.brute_force_attempts
  WHERE attempted_at > now() - interval '24 hours';

  -- Unusual sessions (multiple IPs for same user)
  RETURN QUERY
  SELECT
    'unusual_sessions'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'normal' END::TEXT,
    'Sesiones inusuales'::TEXT,
    'Usuarios con multiples IPs en las ultimas 24 horas'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'users', jsonb_agg(jsonb_build_object('user_id', user_id, 'ip_count', ip_count))
    )
  FROM (
    SELECT user_id, COUNT(DISTINCT ip_address) AS ip_count
    FROM public.user_sessions
    WHERE login_at > now() - interval '24 hours' AND ip_address IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(DISTINCT ip_address) > 1
  ) sub;

  -- Admin actions
  RETURN QUERY
  SELECT
    'admin_actions'::TEXT,
    'normal'::TEXT,
    'Acciones administrativas'::TEXT,
    'Acciones realizadas por administradores en los ultimos 7 dias'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'actions', jsonb_object_agg(action, cnt)
    )
  FROM (
    SELECT action, COUNT(*) AS cnt
    FROM public.activity_logs
    WHERE admin_id IS NOT NULL AND created_at > now() - interval '7 days'
    GROUP BY action
  ) sub;

  -- Important changes (role changes, user modifications)
  RETURN QUERY
  SELECT
    'important_changes'::TEXT,
    'warning'::TEXT,
    'Cambios importantes'::TEXT,
    'Cambios de rol, permisos y eliminaciones en los ultimos 30 dias'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'changes', jsonb_agg(jsonb_build_object('action', action, 'details', details, 'created_at', created_at))
    )
  FROM public.activity_logs
  WHERE (action LIKE '%role%' OR action LIKE '%delete%' OR action LIKE '%suspend%' OR action LIKE '%lock%' OR action LIKE '%permission%')
    AND created_at > now() - interval '30 days';

  -- Security events
  RETURN QUERY
  SELECT
    'security_events'::TEXT,
    CASE WHEN COUNT(*) > 5 THEN 'critical' WHEN COUNT(*) > 0 THEN 'warning' ELSE 'normal' END::TEXT,
    'Eventos de seguridad'::TEXT,
    'Eventos potencialmente sospechosos detectados'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'events', jsonb_agg(jsonb_build_object('action', action, 'details', details, 'created_at', created_at))
    )
  FROM public.activity_logs
  WHERE (action ILIKE '%unauthorized%' OR action ILIKE '%fail%' OR action ILIKE '%brute%' OR action ILIKE '%suspicious%')
    AND created_at > now() - interval '7 days';
END;
$$;

-- ============================================================
-- 7. RPC: Get distinct actions for filter dropdown
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_audit_actions()
RETURNS TABLE (action TEXT) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT action FROM public.activity_logs ORDER BY action;
$$;

-- ============================================================
-- 8. RPC: Get distinct modules for filter dropdown
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_audit_modules()
RETURNS TABLE (module TEXT) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT module FROM public.activity_logs WHERE module IS NOT NULL ORDER BY module;
$$;
