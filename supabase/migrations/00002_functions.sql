-- =============================================================
-- AscensoCIM Peru - Migracion 00002: Functions
-- =============================================================
-- Crea todas las funciones PL/pgSQL y RPC del proyecto.

-- Verifica si el usuario actual es admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Obtiene los modulos del usuario con su estado de acceso y bloqueo
create or replace function public.get_user_modules(p_user_id uuid)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  blocked boolean,
  blocked_reason text,
  can_access boolean
)
language sql
stable
security definer set search_path = ''
as $$
  select
    m.id,
    m.name,
    m.slug,
    m.description,
    (bm.id is not null) as blocked,
    bm.reason as blocked_reason,
    coalesce(p.can_access, true) as can_access
  from public.modules m
  left join public.blocked_modules bm on bm.module_id = m.id and bm.user_id = p_user_id
  left join public.permissions p on p.module_id = m.id and p.user_id = p_user_id
  order by m.name;
$$;

-- Registra un intento de login fallido y bloquea tras 5 intentos en 15 min
create or replace function public.record_failed_login(p_email text, p_ip text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_attempts int;
begin
  insert into public.brute_force_attempts (email, ip_address) values (p_email, p_ip);

  select count(*) into v_attempts
  from public.brute_force_attempts
  where email = p_email
    and attempted_at > now() - interval '15 minutes';

  if v_attempts >= 5 then
    update public.profiles
    set
      locked_until = now() + interval '15 minutes',
      login_attempts = v_attempts
    where email = p_email;
  end if;
end;
$$;

-- Reinicia intentos de login despues de un login exitoso
create or replace function public.reset_login_attempts(p_email text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set
    login_attempts = 0,
    locked_until = null,
    last_login = now()
  where email = p_email;
end;
$$;
