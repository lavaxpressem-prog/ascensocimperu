-- =============================================================
-- AscensoCIM Peru - Migracion 00001: Schema (Tablas)
-- =============================================================
-- Ejecutar primero. Crea todas las tablas, enums y constraints.

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";

-- =============================================================
-- 1. ENUMS
-- =============================================================
create type user_status as enum ('pending', 'approved', 'suspended', 'locked');

-- =============================================================
-- 2. TABLES
-- =============================================================

-- Profiles (extiende auth.users de Supabase)
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  name              text,
  apellido_paterno  text,
  apellido_materno  text,
  cip               text unique,
  status            user_status not null default 'pending',
  role              text not null default 'user' check (role in ('admin', 'user', 'supervisor')),
  login_attempts    integer not null default 0,
  locked_until      timestamptz,
  last_login        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Modules
create table public.modules (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

-- User Module Permissions
create table public.permissions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  module_id   uuid not null references public.modules(id) on delete cascade,
  can_access  boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(user_id, module_id)
);

-- Blocked Modules (admin puede bloquear modulos especificos por usuario)
create table public.blocked_modules (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  module_id   uuid not null references public.modules(id) on delete cascade,
  reason      text,
  blocked_at  timestamptz not null default now(),
  unique(user_id, module_id)
);

-- Activity Logs
create table public.activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  action      text not null,
  details     jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

-- Brute Force Attempts
create table public.brute_force_attempts (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null,
  ip_address   text,
  attempted_at timestamptz not null default now()
);
