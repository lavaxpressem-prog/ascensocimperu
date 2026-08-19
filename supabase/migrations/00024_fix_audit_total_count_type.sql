-- ============================================================
-- Migration 00024: Fix get_audit_logs total_count type mismatch
-- ============================================================
-- The error "structure of query does not match function result type"
-- is caused by %s AS total_count in the dynamic SQL of get_audit_logs.
--
-- format('%s', v_total) converts BIGINT to text, and when PostgreSQL
-- re-parses the dynamic SQL, it infers the literal as integer, not bigint.
-- RETURN QUERY EXECUTE is strict about type matching, so this causes
-- the error because RETURNS TABLE declares total_count BIGINT.
--
-- Fix: cast the injected value explicitly as ::bigint.
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
    v_where := v_where || format(
      ' AND (p.email ILIKE %L OR p.name ILIKE %L OR al.action ILIKE %L OR al.module ILIKE %L OR al.details::text ILIKE %L)',
      '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%'
    );
  END IF;

  v_count_sql := format(
    'SELECT COUNT(*) FROM public.activity_logs al LEFT JOIN public.profiles p ON p.id = al.user_id WHERE %s',
    v_where
  );
  EXECUTE v_count_sql INTO v_total;

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
      %s::bigint AS total_count
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
