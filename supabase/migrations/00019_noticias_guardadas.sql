-- ============================================================
-- Migration 00019: Tabla de Noticias Guardadas
-- ============================================================
-- Permite a los usuarios guardar/favoritos noticias.
-- ============================================================

DROP TABLE IF EXISTS public.noticias_guardadas;

CREATE TABLE public.noticias_guardadas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  noticia_id    UUID NOT NULL REFERENCES public.noticias(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, noticia_id)
);

ALTER TABLE public.noticias_guardadas ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden ver sus propias noticias guardadas
CREATE POLICY "Users read own saved noticias"
  ON public.noticias_guardadas
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuarios autenticados pueden guardar noticias
CREATE POLICY "Users insert own saved noticias"
  ON public.noticias_guardadas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios autenticados pueden eliminar sus guardados
CREATE POLICY "Users delete own saved noticias"
  ON public.noticias_guardadas
  FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_noticias_guardadas_user ON public.noticias_guardadas(user_id);
CREATE INDEX idx_noticias_guardadas_noticia ON public.noticias_guardadas(noticia_id);
