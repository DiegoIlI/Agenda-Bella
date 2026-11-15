-- Agenda Bella 1.0 (base) | Ejecuta en Supabase > SQL Editor como propietario.
-- v3: este archivo ya es re-ejecutable (políticas y restricción con guardas). Después ejecuta 002 y 003.
-- NO lo vuelvas a ejecutar DESPUÉS de 003 (volvería a crear funciones antiguas); usa setup_completo.sql o solo 003.
-- ZONA HORARIA DEL NEGOCIO: America/Merida.
-- Citas: confirmación instantánea y exclusión transaccional de horarios solapados.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff(p_uid uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists(select 1 from public.staff_users where user_id = p_uid);
$$;
revoke all on function public.is_staff(uuid) from public;
grant execute on function public.is_staff(uuid) to authenticated;

create table if not exists public.salon_settings (
  id smallint primary key default 1 check (id = 1),
  salon_name text not null default 'Agenda Bella',
  tagline text not null default 'Tu belleza, nuestro arte',
  whatsapp_phone text not null default '9997666778',
  instagram text not null default '',
  booking_window_days integer not null default 60 check (booking_window_days between 7 and 180)
);
insert into public.salon_settings(id,salon_name,tagline,whatsapp_phone)
values (1,'Agenda Bella','Tu belleza, nuestro arte','9997666778') on conflict (id) do nothing;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null default '',
  emoji text not null default '✦',
  price numeric(10,2) not null default 0 check (price >= 0),
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 600),
  active boolean not null default true,
  sort_order integer not null default 0
);
insert into public.services (name,category,description,emoji,price,duration_minutes,sort_order)
select v.name,v.category,v.description,v.emoji,v.price,v.duration_minutes,v.sort_order
from (values
 ('Corte de cabello','Cabello','Un cambio que se siente increíble.','✂️',180,45,1),
 ('Tinte completo','Cabello','Color, brillo y personalidad.','🎨',650,120,2),
 ('Mechas / Balayage','Cabello','Luz y dimensión para tu cabello.','✨',1200,180,3),
 ('Peinado profesional','Cabello','Luce espectacular en tu ocasión.','🌷',280,60,4),
 ('Manicura','Uñas','Manos lindas, cuidado completo.','💅',180,45,5),
 ('Uñas acrílicas','Uñas','Diseños que hablan de ti.','💎',450,120,6),
 ('Pedicura','Bienestar','Un momento de cuidado para ti.','🫧',250,60,7),
 ('Tratamiento capilar','Cabello','Nutrición y suavidad profunda.','🌿',400,90,8)
) as v(name,category,description,emoji,price,duration_minutes,sort_order)
where not exists(select 1 from public.services limit 1);

create table if not exists public.working_hours (
  weekday smallint primary key check (weekday between 0 and 6), -- 0=domingo, 1=lunes
  start_time time not null default '09:00',
  end_time time not null default '19:00',
  is_open boolean not null default true,
  check (end_time > start_time)
);
insert into public.working_hours(weekday,start_time,end_time,is_open) values
(0,'09:00','17:00',false),(1,'09:00','19:00',true),(2,'09:00','19:00',true),
(3,'09:00','19:00',true),(4,'09:00','19:00',true),(5,'09:00','19:00',true),
(6,'09:00','16:00',true) on conflict (weekday) do nothing;

create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists idx_time_off_range on public.time_off using gist(tstzrange(start_at,end_at,'[)'));

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_token uuid not null default gen_random_uuid() unique,
  service_id uuid not null references public.services(id) on delete restrict,
  client_name text not null check(length(client_name) between 2 and 70),
  phone text not null check(phone ~ '^[0-9]{10}$'),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
  whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  check(end_at > start_at)
);
create index if not exists idx_bookings_start on public.bookings(start_at);
create index if not exists idx_bookings_phone_created on public.bookings(phone,created_at);
-- Garantía de no doble reserva aunque dos teléfonos confirmen simultáneamente.
do $$
begin
 if not exists (select 1 from pg_constraint where conname='bookings_no_overlap' and conrelid='public.bookings'::regclass) then
  alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (tstzrange(start_at,end_at,'[)') with &&)
  where (status = 'confirmed');
 end if;
end $$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (booking_id,endpoint)
);

create table if not exists public.reminder_attempts (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  channel text not null check(channel in ('whatsapp','push')),
  status text not null default 'processing' check(status in ('processing','sent','failed')),
  attempts integer not null default 1,
  updated_at timestamptz not null default now(),
  last_error text,
  primary key (booking_id,channel)
);

-- RLS: la clienta no puede listar números ni datos de otras clientas.
alter table public.staff_users enable row level security;
alter table public.salon_settings enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.bookings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_attempts enable row level security;

drop policy if exists staff_read_self on public.staff_users;
create policy staff_read_self on public.staff_users for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists cfg_public_read on public.salon_settings;
create policy cfg_public_read on public.salon_settings for select to anon,authenticated using (true);
drop policy if exists cfg_admin_update on public.salon_settings;
create policy cfg_admin_update on public.salon_settings for update to authenticated using (public.is_staff((select auth.uid()))) with check(public.is_staff((select auth.uid())));
drop policy if exists services_anon_read on public.services;
create policy services_anon_read on public.services for select to anon using (active);
drop policy if exists services_auth_read on public.services;
create policy services_auth_read on public.services for select to authenticated using (active or public.is_staff((select auth.uid())));
drop policy if exists services_admin_update on public.services;
create policy services_admin_update on public.services for update to authenticated using(public.is_staff((select auth.uid()))) with check(public.is_staff((select auth.uid())));
drop policy if exists services_admin_insert on public.services;
create policy services_admin_insert on public.services for insert to authenticated with check(public.is_staff((select auth.uid())));
drop policy if exists hours_public_read on public.working_hours;
create policy hours_public_read on public.working_hours for select to anon,authenticated using(true);
drop policy if exists hours_admin_update on public.working_hours;
create policy hours_admin_update on public.working_hours for update to authenticated using(public.is_staff((select auth.uid()))) with check(public.is_staff((select auth.uid())));
drop policy if exists timeoff_admin_all on public.time_off;
create policy timeoff_admin_all on public.time_off for all to authenticated using(public.is_staff((select auth.uid()))) with check(public.is_staff((select auth.uid())));
drop policy if exists bookings_admin_read on public.bookings;
create policy bookings_admin_read on public.bookings for select to authenticated using(public.is_staff((select auth.uid())));
drop policy if exists bookings_admin_update on public.bookings;
create policy bookings_admin_update on public.bookings for update to authenticated using(public.is_staff((select auth.uid()))) with check(public.is_staff((select auth.uid())));
-- No policy for public booking insert, subscription read, reminder logs. Only RPC / service_role.

-- Horarios públicos sin revelar nombres o teléfonos.
create or replace function public.available_slots(p_service_id uuid,p_day date)
returns table(time_label text)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
 v_duration integer;
 v_h public.working_hours%rowtype;
 v_slot timestamp;
 v_start timestamptz;
 v_end timestamptz;
 v_today date := (now() at time zone 'America/Merida')::date;
 v_window int;
begin
 select duration_minutes into v_duration from public.services where id=p_service_id and active;
 select booking_window_days into v_window from public.salon_settings where id=1;
 if v_duration is null or p_day<v_today or p_day>v_today+coalesce(v_window,60) then return; end if;
 select * into v_h from public.working_hours where weekday=extract(dow from p_day)::int;
 if not found or not v_h.is_open then return; end if;
 for v_slot in select generate_series(p_day+v_h.start_time,(p_day+v_h.end_time)-make_interval(mins=>v_duration),interval '30 minutes') loop
  v_start:=v_slot at time zone 'America/Merida';
  v_end:=(v_slot+make_interval(mins=>v_duration)) at time zone 'America/Merida';
  if v_start > now()+interval '30 minutes'
   and not exists(select 1 from public.bookings b where b.status='confirmed' and tstzrange(b.start_at,b.end_at,'[)') && tstzrange(v_start,v_end,'[)'))
   and not exists(select 1 from public.time_off t where tstzrange(t.start_at,t.end_at,'[)') && tstzrange(v_start,v_end,'[)'))
  then time_label:=to_char(v_slot,'HH24:MI');return next; end if;
 end loop;
end;$$;

create or replace function public.monthly_availability(p_service_id uuid,p_month date)
returns table(day date,free_slots integer)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_day date; v_first date;
begin
 v_first:=date_trunc('month',p_month)::date;
 if v_first < date_trunc('month',(now() at time zone 'America/Merida'))::date or v_first > ((now() at time zone 'America/Merida')::date+interval '7 months')::date then return;end if;
 for v_day in select generate_series(v_first,(v_first+interval '1 month - 1 day')::date,interval '1 day')::date loop
  day:=v_day;select count(*)::int into free_slots from public.available_slots(p_service_id,v_day);return next;
 end loop;
end;$$;

create or replace function public.book_appointment(
 p_service_id uuid,p_day date,p_time text,p_name text,p_phone text,p_whatsapp_opt_in boolean
) returns table(booking_id uuid,token uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_service public.services%rowtype;v_start timestamptz;v_end timestamptz;v_id uuid;v_token uuid;v_digits text;
begin
 v_digits:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if length(trim(coalesce(p_name,''))) not between 2 and 70 or v_digits !~ '^[0-9]{10}$' then
  raise exception 'Escribe un nombre válido y un teléfono mexicano de 10 dígitos.';
 end if;
 if p_time !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Selecciona una hora válida.';end if;
 select * into v_service from public.services where id=p_service_id and active;
 if not found then raise exception 'Servicio no disponible.';end if;
 if not exists(select 1 from public.available_slots(p_service_id,p_day) where time_label=p_time) then
  raise exception 'Ese horario ya no está disponible. Elige otro.';
 end if;
 if (select count(*) from public.bookings where phone=v_digits and status='confirmed' and created_at>now()-interval '24 hours')>=3 then
  raise exception 'Límite temporal de citas para ese teléfono. Comunícate con el salón.';
 end if;
 v_start:=(p_day + p_time::time) at time zone 'America/Merida';
 v_end:=((p_day+p_time::time)+make_interval(mins=>v_service.duration_minutes)) at time zone 'America/Merida';
 insert into public.bookings(service_id,client_name,phone,start_at,end_at,whatsapp_opt_in)
 values(p_service_id,trim(p_name),v_digits,v_start,v_end,coalesce(p_whatsapp_opt_in,false))
 returning id,booking_token into v_id,v_token;
 booking_id:=v_id;token:=v_token;return next;
exception when exclusion_violation then
 raise exception 'Otra clienta acaba de reservar ese horario. Selecciona uno diferente.';
end;$$;

create or replace function public.appointment_detail(p_token uuid)
returns table(client_name text,service_name text,start_at timestamptz,status text,whatsapp_opt_in boolean)
language sql stable security definer set search_path=public,pg_temp as $$
 select b.client_name,s.name,b.start_at,b.status,b.whatsapp_opt_in
 from public.bookings b join public.services s on s.id=b.service_id
 where b.booking_token=p_token;
$$;
create or replace function public.cancel_appointment(p_token uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.bookings set status='cancelled'
 where booking_token=p_token and status='confirmed' and start_at>now()
 ;return found;
end;$$;

create or replace function public.revoke_whatsapp(p_token uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.bookings set whatsapp_opt_in=false where booking_token=p_token and status='confirmed';
 return found;
end;$$;

create or replace function public.register_push(p_token uuid,p_endpoint text,p_p256dh text,p_auth text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 select id into v_id from public.bookings where booking_token=p_token and status='confirmed' and start_at>now();
 if v_id is null then raise exception 'Esta cita no acepta nuevas notificaciones.';end if;
 if length(coalesce(p_endpoint,''))<20 or length(p_endpoint)>2000 or p_endpoint not like 'https://%' or length(coalesce(p_p256dh,''))<20 or length(coalesce(p_auth,''))<8 then
  raise exception 'Suscripción de notificación no válida.';
 end if;
 insert into public.push_subscriptions(booking_id,endpoint,p256dh,auth_key)
 values(v_id,p_endpoint,p_p256dh,p_auth)
 on conflict(booking_id,endpoint) do update set p256dh=excluded.p256dh,auth_key=excluded.auth_key;
end;$$;

-- RPC privados para prevenir envíos duplicados y registrar fallos para reintentos.
create or replace function public.claim_reminder(p_booking_id uuid,p_channel text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_claimed uuid;
begin
 if p_channel not in ('whatsapp','push') then return false;end if;
 insert into public.reminder_attempts(booking_id,channel,status,attempts,updated_at)
 values(p_booking_id,p_channel,'processing',1,now())
 on conflict(booking_id,channel) do update
 set status='processing',attempts=public.reminder_attempts.attempts+1,updated_at=now(),last_error=null
 where (public.reminder_attempts.status='failed' and public.reminder_attempts.attempts<3)
    or (public.reminder_attempts.status='processing' and public.reminder_attempts.updated_at<now()-interval '15 minutes' and public.reminder_attempts.attempts<3)
 returning booking_id into v_claimed;
 return v_claimed is not null;
end;$$;
create or replace function public.finish_reminder(p_booking_id uuid,p_channel text,p_ok boolean,p_error text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.reminder_attempts set status=case when p_ok then 'sent' else 'failed' end,
 last_error=left(p_error,400),updated_at=now()
 where booking_id=p_booking_id and channel=p_channel and status='processing';
end;$$;

-- Por defecto PostgreSQL permite EXECUTE a PUBLIC: restringimos funciones privadas.
revoke all on function public.claim_reminder(uuid,text) from public,anon,authenticated;
revoke all on function public.finish_reminder(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_reminder(uuid,text) to service_role;
grant execute on function public.finish_reminder(uuid,text,boolean,text) to service_role;
grant execute on function public.available_slots(uuid,date) to anon,authenticated;
grant execute on function public.monthly_availability(uuid,date) to anon,authenticated;
grant execute on function public.book_appointment(uuid,date,text,text,text,boolean) to anon,authenticated;
grant execute on function public.appointment_detail(uuid) to anon,authenticated;
grant execute on function public.cancel_appointment(uuid) to anon,authenticated;
grant execute on function public.revoke_whatsapp(uuid) to anon,authenticated;
grant execute on function public.register_push(uuid,text,text,text) to anon,authenticated;

-- IMPORTANTE: El usuario administrador se agrega DESPUÉS de crear cuenta en Auth:
-- insert into public.staff_users(user_id) values ('UUID_REAL_DE_TU_MAMA');

-- Permisos explícitos. RLS sigue siendo la capa que determina qué filas se ven.
grant select on public.salon_settings,public.services,public.working_hours to anon,authenticated;
grant select on public.staff_users to authenticated;
grant update on public.salon_settings to authenticated;
grant insert,update on public.services to authenticated;
grant update on public.working_hours to authenticated;
grant select,insert,update,delete on public.time_off to authenticated;
grant select,update on public.bookings to authenticated;

-- Notificaciones de cambios a la cuenta administradora (RLS filtra los datos).
do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='bookings')
 then alter publication supabase_realtime add table public.bookings;end if;
end $$;
