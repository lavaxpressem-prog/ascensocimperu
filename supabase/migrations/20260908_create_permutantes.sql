-- =============================================
-- TABLA: permutantes
-- Módulo de publicación de permutas entre unidades
-- =============================================

CREATE TABLE IF NOT EXISTS permutantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unidad_origen TEXT NOT NULL,
  unidad_destino TEXT NOT NULL,
  telefono TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'NO_DISPONIBLE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_permutantes_user_id ON permutantes(user_id);
CREATE INDEX idx_permutantes_estado ON permutantes(estado);
CREATE INDEX idx_permutantes_unidad_origen ON permutantes(unidad_origen);
CREATE INDEX idx_permutantes_unidad_destino ON permutantes(unidad_destino);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE permutantes ENABLE ROW LEVEL POLICY;

-- Lectura: usuarios autenticados pueden ver publicaciones disponibles
CREATE POLICY "permutantes_select_disponibles"
  ON permutantes FOR SELECT
  TO authenticated
  USING (estado = 'DISPONIBLE' OR user_id = auth.uid());

-- Lectura: usuario autenticado puede ver sus propias publicaciones (incluyendo NO_DISPONIBLE)
CREATE POLICY "permutantes_select_own"
  ON permutantes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Creación: usuario autenticado puede crear su propia publicación
CREATE POLICY "permutantes_insert_own"
  ON permutantes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Actualización: usuario solamente puede modificar sus propias publicaciones
CREATE POLICY "permutantes_update_own"
  ON permutantes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Eliminación: usuario solamente puede eliminar sus propias publicaciones
CREATE POLICY "permutantes_delete_own"
  ON permutantes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- TRIGGER: actualizar updated_at automáticamente
-- =============================================

CREATE OR REPLACE FUNCTION update_permutantes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_permutantes_updated_at
  BEFORE UPDATE ON permutantes
  FOR EACH ROW
  EXECUTE FUNCTION update_permutantes_updated_at();

-- =============================================
-- FUNCIÓN: obtener permutas disponibles
-- =============================================

CREATE OR REPLACE FUNCTION get_permutas_disponibles()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  unidad_origen TEXT,
  unidad_destino TEXT,
  telefono TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_name TEXT,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.unidad_origen,
    p.unidad_destino,
    p.telefono,
    p.estado,
    p.created_at,
    p.updated_at,
    COALESCE(pr.name, 'Usuario') as user_name,
    pr.email as user_email
  FROM permutantes p
  LEFT JOIN profiles pr ON p.user_id = pr.id
  WHERE p.estado = 'DISPONIBLE'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCIÓN: obtener mis permutas
-- =============================================

CREATE OR REPLACE FUNCTION get_my_permutas()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  unidad_origen TEXT,
  unidad_destino TEXT,
  telefono TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.unidad_origen,
    p.unidad_destino,
    p.telefono,
    p.estado,
    p.created_at,
    p.updated_at
  FROM permutantes p
  WHERE p.user_id = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
