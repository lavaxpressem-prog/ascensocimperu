-- ============================================================
-- FASE 8: FUNCIÓN get_admin_stats()
-- Se reemplaza solamente si las tablas dependientes existen.
-- ============================================================

DO $migration$
DECLARE
  has_uploaded_files boolean;
  has_activity_logs boolean;
BEGIN

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'uploaded_files'
  )
  INTO has_uploaded_files;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'activity_logs'
  )
  INTO has_activity_logs;

  IF has_uploaded_files AND has_activity_logs THEN

    EXECUTE $function$
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
      )
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT
          (SELECT COUNT(*) FROM public.profiles) AS total_users,
          (SELECT COUNT(*)
           FROM public.profiles
           WHERE status = 'approved') AS active_users,
          (SELECT COUNT(*)
           FROM public.profiles
           WHERE status = 'pending') AS pending_users,
          (SELECT COUNT(*)
           FROM public.profiles
           WHERE status IN ('locked', 'suspended')) AS locked_users,
          (SELECT COUNT(*) FROM public.preguntas) AS total_questions,
          (SELECT COUNT(*) FROM public.noticias) AS total_noticias,
          (SELECT COUNT(*)
           FROM public.noticias
           WHERE status = 'published') AS published_noticias,
          (SELECT COUNT(*) FROM public.uploaded_files) AS total_files,
          (SELECT COUNT(*)
           FROM public.profiles
           WHERE last_login IS NOT NULL) AS total_logins,
          (SELECT COUNT(*)
           FROM public.activity_logs
           WHERE created_at > now() - interval '7 days') AS recent_activity;
      $body$;
    $function$;

  END IF;

END;
$migration$;