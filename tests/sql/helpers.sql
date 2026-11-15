create schema if not exists t;
create table if not exists t.log(n serial, ok boolean, name text, detail text);
create or replace function t.check(p_name text, p_cond boolean, p_detail text default '') returns void
language plpgsql as $$ begin insert into t.log(ok,name,detail) values (coalesce(p_cond,false),p_name,p_detail); end $$;
-- Ejecuta SQL como un rol de la API y devuelve 'ok' o el mensaje de error.
create or replace function t.run_as(p_role text, p_uid uuid, p_sql text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  execute 'set local role '||quote_ident(p_role);
  execute p_sql;
  reset role;
  return 'ok';
exception when others then
  reset role; return sqlerrm;
end $$;
-- Ejecuta una consulta de un solo valor como rol y devuelve el valor (o 'ERROR: ...').
create or replace function t.scalar_as(p_role text, p_uid uuid, p_sql text) returns text
language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  execute 'set local role '||quote_ident(p_role);
  execute p_sql into v;
  reset role;
  return v;
exception when others then
  reset role; return 'ERROR: '||sqlerrm;
end $$;
