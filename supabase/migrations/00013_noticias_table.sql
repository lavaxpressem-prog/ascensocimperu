-- ============================================================
-- Migration 00013: Tabla de Noticias
-- ============================================================
-- Crea la tabla noticias para la página "Noticias" y carga
-- los registros de ejemplo que ya se mostraban en el diseño.
-- ============================================================

DROP TABLE IF EXISTS public.noticias;

CREATE TABLE public.noticias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo              TEXT NOT NULL,
  descripcion         TEXT NOT NULL,
  categoria           TEXT NOT NULL,
  fuente              TEXT NOT NULL,
  estado              TEXT,
  fecha_publicacion   DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url             TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Allow public read noticias"
  ON public.noticias
  FOR SELECT
  USING (true);

-- Política de inserción solo para usuarios autenticados
CREATE POLICY "Allow authenticated insert noticias"
  ON public.noticias
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política de actualización solo para usuarios autenticados
CREATE POLICY "Allow authenticated update noticias"
  ON public.noticias
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Política de eliminación solo para usuarios autenticados
CREATE POLICY "Allow authenticated delete noticias"
  ON public.noticias
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Datos iniciales (los 4 ejemplos del diseño original)
INSERT INTO public.noticias (titulo, descripcion, categoria, fuente, estado, fecha_publicacion)
VALUES
  (
    'Ley N° 30714 - Ley de la Policía Nacional del Perú',
    'Se modifica la Ley N° 30714 para fortalecer la estructura y funciones de la PNP.',
    'Ley',
    'Diario Oficial El Peruano',
    'Vigente',
    '2026-06-02'
  ),
  (
    'Resolución Ministerial N° 456-2026-IN',
    'Aprueban el nuevo protocolo para intervenciones policiales en la vía pública.',
    'Resolución',
    'MININTER',
    'Nueva',
    '2026-06-01'
  ),
  (
    'Decreto Supremo N° 003-2026-IN',
    'Reglamento del uso de la fuerza por parte de la Policía Nacional del Perú.',
    'Decreto',
    'MININTER',
    'Modificada',
    '2026-05-31'
  ),
  (
    'Directiva N° 010-2026-CG PNP/EMG',
    'Lineamientos para la evaluación de desempeño del personal policial.',
    'Directiva',
    'Comandancia General PNP',
    'Vigente',
    '2026-05-30'
  );
