-- ============================================================
-- Migration 00025: Fix run_audit_analysis ambiguous column
-- ============================================================
-- Error: "column reference 'details' is ambiguous"
--
-- Cause: RETURNS TABLE declares a column named "details JSONB",
-- which creates an implicit PL/pgSQL variable. In blocks 6 and 7,
-- the bare reference "details" inside jsonb_build_object() is
-- ambiguous between activity_logs.details and the implicit variable.
--
-- Fix: Add explicit table alias "al" to FROM clauses and qualify
-- all column references as "al.details", "al.action", etc.
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
  -- 1. Recent activities (24h)
  RETURN QUERY
  SELECT
    'activities'::TEXT,
    'normal'::TEXT,
    'Actividades recientes'::TEXT,
    'Resumen de actividades en las ultimas 24 horas'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('actions', jsonb_object_agg(sub.action, sub.cnt))
  FROM (
    SELECT al.action, COUNT(*) AS cnt
    FROM public.activity_logs al
    WHERE al.created_at > now() - interval '24 hours'
    GROUP BY al.action
  ) sub;

  -- 2. Most active users (7d)
  RETURN QUERY
  SELECT
    'active_users'::TEXT,
    'normal'::TEXT,
    'Usuarios con mayor actividad'::TEXT,
    'Top 5 usuarios mas activos en los ultimos 7 dias'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('users', jsonb_agg(jsonb_build_object('user_id', sub.user_id, 'email', sub.email, 'name', sub.name, 'actions', sub.cnt)))
  FROM (
    SELECT al.user_id, p.email, p.name, COUNT(*) AS cnt
    FROM public.activity_logs al
    LEFT JOIN public.profiles p ON p.id = al.user_id
    WHERE al.created_at > now() - interval '7 days'
    GROUP BY al.user_id, p.email, p.name
    ORDER BY cnt DESC
    LIMIT 5
  ) sub;

  -- 3. Failed login attempts (24h)
  RETURN QUERY
  SELECT
    'failed_logins'::TEXT,
    CASE WHEN COUNT(*) > 10 THEN 'critical' WHEN COUNT(*) > 5 THEN 'warning' ELSE 'normal' END::TEXT,
    'Intentos de acceso fallidos'::TEXT,
    'Intentos de login fallidos en las ultimas 24 horas'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('attempts', jsonb_agg(jsonb_build_object('email', bfa.email, 'ip', bfa.ip_address, 'time', bfa.attempted_at)))
  FROM public.brute_force_attempts bfa
  WHERE bfa.attempted_at > now() - interval '24 hours';

  -- 4. Unusual sessions (multiple IPs, 24h)
  RETURN QUERY
  SELECT
    'unusual_sessions'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'normal' END::TEXT,
    'Sesiones inusuales'::TEXT,
    'Usuarios con multiples IPs en las ultimas 24 horas'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('users', jsonb_agg(jsonb_build_object('user_id', sub.user_id, 'ip_count', sub.ip_count)))
  FROM (
    SELECT us.user_id, COUNT(DISTINCT us.ip_address) AS ip_count
    FROM public.user_sessions us
    WHERE us.login_at > now() - interval '24 hours' AND us.ip_address IS NOT NULL
    GROUP BY us.user_id
    HAVING COUNT(DISTINCT us.ip_address) > 1
  ) sub;

  -- 5. Admin actions (7d)
  RETURN QUERY
  SELECT
    'admin_actions'::TEXT,
    'normal'::TEXT,
    'Acciones administrativas'::TEXT,
    'Acciones realizadas por administradores en los ultimos 7 dias'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('actions', jsonb_object_agg(sub.action, sub.cnt))
  FROM (
    SELECT al.action, COUNT(*) AS cnt
    FROM public.activity_logs al
    WHERE al.admin_id IS NOT NULL AND al.created_at > now() - interval '7 days'
    GROUP BY al.action
  ) sub;

  -- 6. Important changes (30d)
  -- FIX: qualified al.details to avoid ambiguity with RETURNS TABLE "details" column
  RETURN QUERY
  SELECT
    'important_changes'::TEXT,
    'warning'::TEXT,
    'Cambios importantes'::TEXT,
    'Cambios de rol, permisos y eliminaciones en los ultimos 30 dias'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('changes', jsonb_agg(jsonb_build_object('action', al.action, 'details', al.details, 'created_at', al.created_at)))
  FROM public.activity_logs al
  WHERE (al.action LIKE '%role%' OR al.action LIKE '%delete%' OR al.action LIKE '%suspend%' OR al.action LIKE '%lock%' OR al.action LIKE '%permission%')
    AND al.created_at > now() - interval '30 days';

  -- 7. Security events (7d)
  -- FIX: qualified al.details to avoid ambiguity with RETURNS TABLE "details" column
  RETURN QUERY
  SELECT
    'security_events'::TEXT,
    CASE WHEN COUNT(*) > 5 THEN 'critical' WHEN COUNT(*) > 0 THEN 'warning' ELSE 'normal' END::TEXT,
    'Eventos de seguridad'::TEXT,
    'Eventos potencialmente sospechosos detectados'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('events', jsonb_agg(jsonb_build_object('action', al.action, 'details', al.details, 'created_at', al.created_at)))
  FROM public.activity_logs al
  WHERE (al.action ILIKE '%unauthorized%' OR al.action ILIKE '%fail%' OR al.action ILIKE '%brute%' OR al.action ILIKE '%suspicious%')
    AND al.created_at > now() - interval '7 days';
END;
$$;
