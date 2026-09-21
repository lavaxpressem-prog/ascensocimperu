-- ============================================================
-- Migration 20260920: Fix modules is_active enforcement
-- ============================================================
-- La función get_user_modules no verificaba modules.is_active.
-- Un módulo desactivado por el admin seguía apareciendo como
-- accesible para todos los usuarios.
--
-- Cambios:
--   1. Agregar columna is_active al retorno de get_user_modules
--   2. Incluir is_active en la lógica de acceso
--   3. Un módulo inactivo se marca como blocked y can_access=false
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_modules(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  blocked boolean,
  blocked_reason text,
  can_access boolean,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    m.id,
    m.name,
    m.slug,
    m.description,
    (bm.id IS NOT NULL OR m.is_active = false) AS blocked,
    CASE
      WHEN bm.id IS NOT NULL THEN bm.reason
      WHEN m.is_active = false THEN 'Modulo desactivado por administrador'
      ELSE NULL
    END AS blocked_reason,
    COALESCE(p.can_access, true) AND COALESCE(m.is_active, true) AS can_access,
    COALESCE(m.is_active, true) AS is_active
  FROM public.modules m
  LEFT JOIN public.blocked_modules bm ON bm.module_id = m.id AND bm.user_id = p_user_id
  LEFT JOIN public.permissions p ON p.module_id = m.id AND p.user_id = p_user_id
  ORDER BY m.name;
$$;

-- ============================================================
-- FIN DE MIGRACION 20260920
-- ============================================================
