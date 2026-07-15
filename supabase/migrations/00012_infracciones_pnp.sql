-- ============================================================
-- Migration 00012: Tabla de infracciones del Régimen Disciplinario PNP
-- ============================================================
-- Crea la tabla infracciones_pnp con las columnas requeridas
-- para el componente "Tabla de Infracciones" (pestaña Régimen
-- Disciplinario).  Execute en Supabase SQL Editor.
-- ============================================================

DROP TABLE IF EXISTS public.infracciones_pnp;

CREATE TABLE public.infracciones_pnp (
  id                  SERIAL PRIMARY KEY,
  codigo              TEXT NOT NULL,
  gravedad            TEXT NOT NULL,
  infraccion          TEXT NOT NULL,
  sancion             TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.infracciones_pnp ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (consulta anónima permitida)
CREATE POLICY "Allow public read infracciones_pnp"
  ON public.infracciones_pnp
  FOR SELECT
  USING (true);

-- Datos iniciales (5 infracciones disciplinarias PNP)
INSERT INTO public.infracciones_pnp (codigo, gravedad, infraccion, medida_preventiva, sancion)
VALUES
  ('D001', 'Muy Grave', 'Faltas grave a los deberes de la función policial sin causa justificada', 'Amonestación escrita', 'Hasta 30 días de suspensión'),
  ('D002', 'Grave',     'Negligencia en el cumplimiento de funciones que cause daño al servicio', 'Descuento salarial',   'Suspensión de 8 a 15 días'),
  ('D003', 'Leve',      'Falta de puntualidad reiterada a las actividades programadas',         'Amonestación verbal',  'Suspensión de 1 a 7 días'),
  ('D004', 'Muy Grave', 'Incumplimiento de deberes que afecte el honor y dignidad de la institución', 'Pérdida de beneficios', 'Destitución'),
  ('D005', 'Grave',     'Abuso de autoridad en el ejercicio de funciones policiales',           'Descuento salarial',   'Suspensión de 15 a 30 días');
