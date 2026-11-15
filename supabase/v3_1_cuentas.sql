-- Agenda Bella v3.1 · Ejecutar UNA VEZ después de setup_completo.sql (v3).
-- No elimina tablas ni citas anteriores.

-- Perfil opcional: registrarse NO concede acceso al panel del salón.
create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_profiles enable row level security;
drop policy if exists client_profiles_own_select on public.client_profiles;
create policy client_profiles_own_select on public.client_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists client_profiles_own_insert on public.client_profiles;
create policy client_profiles_own_insert on public.client_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists client_profiles_own_update on public.client_profiles;
create policy client_profiles_own_update on public.client_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.client_profiles from anon;
grant select, insert, update on public.client_profiles to authenticated;

-- Código de activación de administradora. No hay SELECT público, ni acceso de escritura
-- desde la app. Se genera UNA sola vez desde el SQL Editor, nunca en JS.
create table if not exists public.owner_activation (
  id smallint primary key default 1 check (id = 1),
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);
alter table public.owner_activation enable row level security;
revoke all on public.owner_activation from anon, authenticated;

create or replace function public.redeem_owner_activation(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Inicia sesión y verifica tu correo antes de activar la cuenta.';
  end if;
  -- Evita que dos registros simultáneos se autoricen como dueñas.
  perform pg_catalog.pg_advisory_xact_lock(9173142);
  if exists (select 1 from public.staff_users) then
    raise exception 'El salón ya tiene administradora. Solicita acceso a la dueña.';
  end if;
  update public.owner_activation
  set used_at = now()
  where id = 1 and used_at is null and expires_at > now()
    and code_hash = pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(btrim(p_code), 'UTF8')), 'hex');
  if not found then
    raise exception 'Código de activación inválido, caducado o utilizado.';
  end if;
  insert into public.staff_users(user_id) values ((select auth.uid()));
  return true;
end;
$$;
revoke all on function public.redeem_owner_activation(text) from public, anon;
grant execute on function public.redeem_owner_activation(text) to authenticated;
