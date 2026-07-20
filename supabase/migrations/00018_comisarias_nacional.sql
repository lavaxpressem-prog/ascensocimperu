-- ============================================================
-- Migration 00018: Tabla unificada comisarias_nacional
-- Migración de tablas regionales a tabla nacional consolidada
-- ============================================================

-- 1. Crear tabla unificada
CREATE TABLE IF NOT EXISTS public.comisarias_nacional (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    distrito TEXT,
    provincia TEXT,
    departamento TEXT,
    region_policial TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_comisarias_nacional_nombre ON public.comisarias_nacional(nombre);
CREATE INDEX IF NOT EXISTS idx_comisarias_nacional_departamento ON public.comisarias_nacional(departamento);
CREATE INDEX IF NOT EXISTS idx_comisarias_nacional_region ON public.comisarias_nacional(region_policial);
CREATE INDEX IF NOT EXISTS idx_comisarias_nacional_provincia ON public.comisarias_nacional(provincia);

-- 3. RLS
ALTER TABLE public.comisarias_nacional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comisarias_nacional"
  ON public.comisarias_nacional FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage comisarias_nacional"
  ON public.comisarias_nacional FOR ALL
  USING (exists (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- 4. Migración de datos desde tablas regionales
-- ============================================================

-- PNP (regionales originales)
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, NULL, provincia, NULL, 'PNP', created_at
FROM public.comisarias_pnp;

-- RegPol Arequipa
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, distrito, provincia, 'Arequipa', 'RegPol Arequipa', created_at
FROM public.comisarias_regpol_arequipa;

-- RegPol Lima
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, NULL, provincia, 'Lima', 'RegPol Lima', created_at
FROM public.comisarias_regpol_lima;

-- RegPol Loreto
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, distrito, provincia, 'Loreto', 'RegPol Loreto', created_at
FROM public.comisarias_regpol_loreto;

-- RegPol Moquegua
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, distrito, provincia, 'Moquegua', 'RegPol Moquegua', created_at
FROM public.comisarias_regpol_moquegua;

-- RegPol Puno
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, distrito, provincia, 'Puno', 'RegPol Puno', created_at
FROM public.comisarias_regpol_puno;

-- RegPol Tacna
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, distrito, provincia, 'Tacna', 'RegPol Tacna', created_at
FROM public.comisarias_regpol_tacna;

-- Frente VRAEM
INSERT INTO public.comisarias_nacional (nombre, direccion, telefono, distrito, provincia, departamento, region_policial, created_at)
SELECT nombre, direccion, telefono, distrito, provincia, departamento, 'Frente VRAEM', created_at
FROM public.comisarias_frente_vraem;
