-- =============================================================
-- AscensoCIM Peru - Migracion 00006: Indexes
-- =============================================================
-- Indices para optimizar las consultas mas frecuentes del sistema.

-- Profiles
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_status on public.profiles(status);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_cip on public.profiles(cip);

-- Activity Logs
create index idx_activity_logs_user on public.activity_logs(user_id);
create index idx_activity_logs_created on public.activity_logs(created_at desc);

-- Brute Force Attempts
create index idx_brute_force_email on public.brute_force_attempts(email);
create index idx_brute_force_attempted on public.brute_force_attempts(attempted_at);

-- Permissions
create index idx_permissions_user on public.permissions(user_id);
create index idx_permissions_module on public.permissions(module_id);

-- Blocked Modules
create index idx_blocked_modules_user on public.blocked_modules(user_id);
create index idx_blocked_modules_module on public.blocked_modules(module_id);
