-- ============================================================
-- Fix: Asegurar acceso a Tabla de Infracciones (Régimen Disciplinario)
-- para todos los usuarios autenticados
-- ============================================================

-- 1. Crear tabla reglamento_transito si no existe
CREATE TABLE IF NOT EXISTS public.reglamento_transito (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  tipo TEXT,
  categoria TEXT,
  infraccion TEXT NOT NULL,
  calificacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.reglamento_transito ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes y recrear con auth.uid()
DROP POLICY IF EXISTS "Allow public read infracciones_pnp" ON public.infracciones_pnp;
DROP POLICY IF EXISTS "Allow public read reglamento_transito" ON public.reglamento_transito;

-- 3. Crear políticas robustas usando auth.uid() IS NOT NULL
CREATE POLICY "Authenticated users can read infracciones_pnp"
  ON public.infracciones_pnp FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read reglamento_transito"
  ON public.reglamento_transito FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. Permitir también lectura anónima (para compatibilidad)
CREATE POLICY "Anonymous can read infracciones_pnp"
  ON public.infracciones_pnp FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read reglamento_transito"
  ON public.reglamento_transito FOR SELECT
  USING (true);
