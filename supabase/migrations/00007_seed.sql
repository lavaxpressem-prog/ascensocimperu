-- =============================================================
-- AscensoCIM Peru - Migracion 00007: Seed (Datos iniciales)
-- =============================================================
-- Inserta los modulos del sistema. ON CONFLICT evita duplicados.

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
