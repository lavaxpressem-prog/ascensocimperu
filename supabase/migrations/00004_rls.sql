-- =============================================================
-- AscensoCIM Peru - Migracion 00004: RLS (Row Level Security)
-- =============================================================
-- Habilita RLS en todas las tablas y crea las policies de acceso.

-- Habilitar RLS
alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.permissions enable row level security;
alter table public.blocked_modules enable row level security;
alter table public.activity_logs enable row level security;
alter table public.brute_force_attempts enable row level security;

-- =============================================================
-- PROFILES
-- =============================================================

-- Usuarios leen su propio perfil
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Usuarios actualizan su propio perfil
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins leen todos los perfiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins actualizan todos los perfiles
create policy "Admins can update all profiles"
  on public.profiles for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins insertan perfiles
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================================
-- MODULES
-- =============================================================

-- Usuarios autenticados leen modulos
create policy "Authenticated users can read modules"
  on public.modules for select
  using (auth.role() = 'authenticated');

-- Admins insertan modulos
create policy "Admins can insert modules"
  on public.modules for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins actualizan modulos
create policy "Admins can update modules"
  on public.modules for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins eliminan modulos
create policy "Admins can delete modules"
  on public.modules for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================================
-- PERMISSIONS
-- =============================================================

-- Usuarios leen sus propios permisos
create policy "Users can read own permissions"
  on public.permissions for select
  using (auth.uid() = user_id);

-- Admins leen todos los permisos
create policy "Admins can read all permissions"
  on public.permissions for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins insertan permisos
create policy "Admins can manage permissions"
  on public.permissions for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins actualizan permisos
create policy "Admins can update permissions"
  on public.permissions for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins eliminan permisos
create policy "Admins can delete permissions"
  on public.permissions for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================================
-- BLOCKED MODULES
-- =============================================================

-- Usuarios leen sus propios modulos bloqueados
create policy "Users can read own blocked modules"
  on public.blocked_modules for select
  using (auth.uid() = user_id);

-- Admins leen todos los modulos bloqueados
create policy "Admins can read all blocked modules"
  on public.blocked_modules for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins insertan modulos bloqueados
create policy "Admins can manage blocked modules"
  on public.blocked_modules for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins actualizan modulos bloqueados
create policy "Admins can update blocked modules"
  on public.blocked_modules for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admins eliminan modulos bloqueados
create policy "Admins can delete blocked modules"
  on public.blocked_modules for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================================
-- ACTIVITY LOGS
-- =============================================================

-- Usuarios leen sus propios logs
create policy "Users can read own activity logs"
  on public.activity_logs for select
  using (auth.uid() = user_id);

-- Admins leen todos los logs
create policy "Admins can read all activity logs"
  on public.activity_logs for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Usuarios autenticados insertan logs
create policy "Service can insert activity logs"
  on public.activity_logs for insert
  with check (auth.uid() = user_id);

-- =============================================================
-- BRUTE FORCE ATTEMPTS
-- =============================================================

-- Solo funciones security definer pueden acceder (record_failed_login, reset_login_attempts)
-- Acceso directo desde el navegador esta completamente bloqueado.
create policy "Deny all direct access to brute force attempts"
  on public.brute_force_attempts for all
  using (false)
  with check (false);
