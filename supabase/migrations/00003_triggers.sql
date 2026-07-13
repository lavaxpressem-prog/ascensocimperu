-- =============================================================
-- AscensoCIM Peru - Migracion 00003: Triggers
-- =============================================================
-- Triggers que se ejecutan automaticamente en la base de datos.

-- Auto-crear perfil cuando se registra un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, apellido_paterno, apellido_materno, cip, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'apellido_paterno',
    new.raw_user_meta_data ->> 'apellido_materno',
    new.raw_user_meta_data ->> 'cip',
    'pending'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-actualizar updated_at en profiles cuando se modifica un registro
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();
