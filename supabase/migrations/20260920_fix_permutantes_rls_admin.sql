-- ============================================================
-- Migration 20260920: Fix permutantes RLS for admin operations
-- ============================================================
-- Agrega policies de admin para que los administradores puedan:
--   - INSERTAR permutas por cuenta de cualquier usuario
--   - ACTUALIZAR permutas de cualquier usuario
--   - ELIMINAR permutas de cualquier usuario
--
-- Sin estas policies, el admin solo puede gestionar sus propias
-- permutas (user_id = auth.uid()), lo cual bloquea la gestión
-- administrativa completa del módulo.
-- ============================================================

-- ── Admin INSERT: permitir a admins crear permutas para cualquier usuario ──
CREATE POLICY "permutantes_admin_insert"
  ON permutantes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ── Admin UPDATE: permitir a admins actualizar cualquier permuta ──
CREATE POLICY "permutantes_admin_update"
  ON permutantes FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Admin DELETE: permitir a admins eliminar cualquier permuta ──
CREATE POLICY "permutantes_admin_delete"
  ON permutantes FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- FIN DE MIGRACION 20260920
-- ============================================================
