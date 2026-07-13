-- =============================================================
-- AscensoCIM Peru - Seed SQL (ejecucion manual)
-- =============================================================
-- Este archivo contiene los datos iniciales del sistema.
-- Ejecutarlo una vez despues de aplicar todas las migraciones.
--
-- Uso:
--   psql -f supabase/seed.sql
--   o ejecutar desde el Dashboard de Supabase SQL Editor

-- Modulos del sistema
insert into public.modules (name, slug, description) values
  ('Inicio', 'home', 'Pagina principal'),
  ('Noticias', 'temarios', 'Noticias y temarios'),
  ('Banco de Preguntas', 'exam', 'Banco de preguntas para examen'),
  ('Audio Preguntas', 'audio', 'Audio de preguntas'),
  ('Practica por Temas', 'practica', 'Practica por temas'),
  ('Inteligencia Artificial', 'ia', 'Asistente de IA'),
  ('Tabla Infracciones', 'infracciones', 'Tabla de infracciones'),
  ('Directorio Telefonico', 'directorio', 'Directorio telefonico'),
  ('Mapa Jurisdiccional', 'mapa', 'Mapa jurisdiccional'),
  ('Buscar Papeletas ATU', 'papeletas-atu', 'Busqueda de papeletas ATU'),
  ('Usuarios', 'admin-users', 'Gestion de usuarios'),
  ('Ayuda', 'ayuda', 'Centro de ayuda')
on conflict (slug) do nothing;

-- =============================================================
-- NOTA: Para crear el primer usuario admin, hacerlo desde
-- el Dashboard de Supabase > Authentication > Users
-- y luego actualizar su role en profiles:
--
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@tudominio.com';
-- =============================================================
