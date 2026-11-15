-- Ejecutar DESPUÉS de v3_1_cuentas.sql desde SQL Editor de Supabase.
-- Muestra UN código de 32 caracteres, de un solo uso, válido por 48 horas.
-- Copia el código de Results y guárdalo solo para la estilista.
-- NO lo subas a GitHub, ni lo pongas dentro del código React.
-- Si ya existe personal en public.staff_users, no se crea un código nuevo.
with nuevo as materialized (
  select upper(replace(gen_random_uuid()::text, '-', '')) as code
  where not exists (select 1 from public.staff_users)
), guardado as (
  insert into public.owner_activation (id, code_hash, expires_at, used_at)
  select 1, encode(sha256(convert_to(code, 'UTF8')), 'hex'), now() + interval '48 hours', null
  from nuevo
  on conflict (id) do update
  set code_hash = excluded.code_hash, expires_at = excluded.expires_at, used_at = null
  returning id
)
select nuevo.code as codigo_de_activacion, 'Válido por 48 horas y un solo uso' as vigencia
from nuevo join guardado on true;
