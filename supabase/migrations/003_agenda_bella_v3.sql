-- ============================================================================
-- Agenda Bella v3 · migración 003
-- Se puede ejecutar varias veces. Funciona tanto sobre una base NUEVA (después
-- de 001 y 002) como sobre una base que ya tenía la versión 1/2. NUNCA borra
-- citas, clientas ni servicios existentes.
-- Zona horaria del negocio: America/Merida.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ajustes del salón (nuevas columnas con valores por omisión seguros)
-- ---------------------------------------------------------------------------
alter table public.salon_settings
  add column if not exists address text not null default '',
  add column if not exists slot_interval_minutes integer not null default 30,
  add column if not exists min_notice_minutes integer not null default 60,
  add column if not exists cancel_min_hours integer not null default 3,
  add column if not exists reminder_hour smallint not null default 9,
  add column if not exists max_active_per_phone smallint not null default 3,
  add column if not exists whatsapp_reminders_active boolean not null default false;  -- lo pone la Edge Function, no la dueña

do $$
begin
  if not exists (select 1 from pg_constraint where conname='salon_settings_slot_interval_chk') then
    alter table public.salon_settings add constraint salon_settings_slot_interval_chk
      check (slot_interval_minutes in (15,20,30,45,60));
  end if;
  if not exists (select 1 from pg_constraint where conname='salon_settings_notice_chk') then
    alter table public.salon_settings add constraint salon_settings_notice_chk
      check (min_notice_minutes between 0 and 10080);
  end if;
  if not exists (select 1 from pg_constraint where conname='salon_settings_cancel_chk') then
    alter table public.salon_settings add constraint salon_settings_cancel_chk
      check (cancel_min_hours between 0 and 168);
  end if;
  if not exists (select 1 from pg_constraint where conname='salon_settings_reminder_hour_chk') then
    alter table public.salon_settings add constraint salon_settings_reminder_hour_chk
      check (reminder_hour between 7 and 20);
  end if;
  if not exists (select 1 from pg_constraint where conname='salon_settings_max_active_chk') then
    alter table public.salon_settings add constraint salon_settings_max_active_chk
      check (max_active_per_phone between 1 and 10);
  end if;
  if not exists (select 1 from pg_constraint where conname='salon_settings_phone_chk') then
    alter table public.salon_settings add constraint salon_settings_phone_chk
      check (whatsapp_phone ~ '^[0-9]{10}$' or whatsapp_phone = '');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Horarios con descanso (comida) opcional por día
-- ---------------------------------------------------------------------------
alter table public.working_hours
  add column if not exists break_start time,
  add column if not exists break_end time;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='working_hours_break_chk') then
    alter table public.working_hours add constraint working_hours_break_chk
      check ((break_start is null and break_end is null)
          or (break_start is not null and break_end is not null and break_end > break_start));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Servicios: icono elegible
-- ---------------------------------------------------------------------------
alter table public.services add column if not exists icon text;

update public.services set icon = case name
  when 'Corte de cabello' then 'scissors'
  when 'Tinte completo' then 'brush'
  when 'Mechas / Balayage' then 'hairwave'
  when 'Peinado profesional' then 'flower'
  when 'Manicura' then 'polish'
  when 'Uñas acrílicas' then 'sparkles'
  when 'Pedicura' then 'droplets'
  when 'Tratamiento capilar' then 'droplets'
  else icon end
where icon is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='services_icon_chk') then
    alter table public.services add constraint services_icon_chk
      check (icon is null or icon in ('scissors','brush','hairwave','polish','sparkles','droplets','flower','hand','heart'));
  end if;
  if not exists (select 1 from pg_constraint where conname='services_name_chk') then
    alter table public.services add constraint services_name_chk
      check (char_length(btrim(name)) between 2 and 80);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Citas: consentimientos, precio congelado, origen y cancelación
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists whatsapp_consent_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists price_at_booking numeric(10,2),
  add column if not exists notes text not null default '',
  add column if not exists created_by text not null default 'client',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text,
  add column if not exists cancel_reason text not null default '',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname='bookings_created_by_chk') then
    alter table public.bookings add constraint bookings_created_by_chk check (created_by in ('client','admin'));
  end if;
end $$;
create index if not exists idx_bookings_status_start on public.bookings(status,start_at);

-- ---------------------------------------------------------------------------
-- 5. Recordatorios: estados honestos (pendiente de configuración / omitido)
-- ---------------------------------------------------------------------------
alter table public.reminder_attempts add column if not exists provider_message_id text;

do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid='public.reminder_attempts'::regclass and contype='c'
             and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.reminder_attempts drop constraint %I', c);
  end loop;
  alter table public.reminder_attempts add constraint reminder_attempts_status_chk
    check (status in ('processing','sent','failed','pending_config','skipped'));
end $$;

create table if not exists public.integration_status (
  id smallint primary key default 1 check (id = 1),
  whatsapp_configured boolean not null default false,
  push_configured boolean not null default false,
  last_run_at timestamptz,
  last_summary jsonb not null default '{}'::jsonb
);
insert into public.integration_status(id) values (1) on conflict (id) do nothing;
alter table public.integration_status enable row level security;
alter table public.reminder_attempts enable row level security;

drop policy if exists integration_admin_read on public.integration_status;
create policy integration_admin_read on public.integration_status for select to authenticated
  using (public.is_staff((select auth.uid())));
drop policy if exists reminders_admin_read on public.reminder_attempts;
create policy reminders_admin_read on public.reminder_attempts for select to authenticated
  using (public.is_staff((select auth.uid())));

-- Defensa en profundidad: Supabase concede por omisión permisos amplios en el
-- esquema public; aquí se retiran en todo lo sensible. RLS sigue activo además.
revoke all on public.bookings, public.push_subscriptions, public.reminder_attempts,
              public.integration_status, public.time_off, public.staff_users from anon;
revoke all on public.push_subscriptions, public.reminder_attempts, public.integration_status from authenticated;
revoke insert, delete, truncate on public.bookings from authenticated;
revoke all on public.salon_settings, public.services, public.working_hours from anon;
grant select on public.salon_settings, public.services, public.working_hours to anon;
grant select on public.reminder_attempts, public.integration_status to authenticated;
grant select, update on public.bookings to authenticated;
grant select on public.staff_users to authenticated;
revoke insert, delete, truncate on public.salon_settings, public.working_hours from authenticated;
revoke delete, truncate on public.services from authenticated;

-- ---------------------------------------------------------------------------
-- 6. Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.normalize_mx_phone(p text)
returns text language sql immutable set search_path=public,pg_temp as $$
  select case
    when d ~ '^[0-9]{10}$' then d
    when d ~ '^52[0-9]{10}$' then substr(d,3)
    when d ~ '^521[0-9]{10}$' then substr(d,4)
    else null end
  from (select regexp_replace(coalesce(p,''),'[^0-9]','','g') as d) x;
$$;

create or replace function public.assert_staff()
returns void language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.is_staff((select auth.uid())) then
    raise exception 'No autorizado.' using errcode='42501';
  end if;
end;$$;

-- ---------------------------------------------------------------------------
-- 7. Disponibilidad REAL (única fuente de verdad: la base de datos)
-- ---------------------------------------------------------------------------
-- Todas las horas de inicio posibles de un día para un servicio, con su estado.
-- No expone nombres ni teléfonos: solo "hora" y "disponible sí/no".
create or replace function public.day_slots(p_service_id uuid, p_day date)
returns table(time_label text, available boolean)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  v_dur integer;
  v_set public.salon_settings%rowtype;
  v_h public.working_hours%rowtype;
  v_today date := (now() at time zone 'America/Merida')::date;
  v_slot timestamp;
  v_start timestamptz;
  v_end timestamptz;
begin
  select duration_minutes into v_dur from public.services where id=p_service_id and active;
  if v_dur is null or p_day is null then return; end if;
  select * into v_set from public.salon_settings where id=1;
  if p_day < v_today or p_day > v_today + v_set.booking_window_days then return; end if;
  select * into v_h from public.working_hours where weekday = extract(dow from p_day)::int;
  if not found or not v_h.is_open then return; end if;

  for v_slot in
    select generate_series(p_day + v_h.start_time,
                           (p_day + v_h.end_time) - make_interval(mins => v_dur),
                           make_interval(mins => v_set.slot_interval_minutes))
  loop
    -- Un servicio no puede cruzar el descanso.
    if v_h.break_start is not null
       and v_slot < p_day + v_h.break_end
       and v_slot + make_interval(mins => v_dur) > p_day + v_h.break_start then
      continue;
    end if;
    v_start := v_slot at time zone 'America/Merida';
    v_end := (v_slot + make_interval(mins => v_dur)) at time zone 'America/Merida';
    time_label := to_char(v_slot, 'HH24:MI');
    available :=
      v_start >= now() + make_interval(mins => v_set.min_notice_minutes)
      and not exists (select 1 from public.bookings b
                      where b.status='confirmed'
                        and tstzrange(b.start_at,b.end_at,'[)') && tstzrange(v_start,v_end,'[)'))
      and not exists (select 1 from public.time_off t
                      where tstzrange(t.start_at,t.end_at,'[)') && tstzrange(v_start,v_end,'[)'));
    return next;
  end loop;
end;$$;

create or replace function public.available_slots(p_service_id uuid, p_day date)
returns table(time_label text)
language sql stable security definer set search_path=public,pg_temp as $$
  select ds.time_label from public.day_slots(p_service_id, p_day) ds where ds.available;
$$;

drop function if exists public.monthly_availability(uuid,date);
create function public.monthly_availability(p_service_id uuid, p_month date)
returns table(day date, free_slots integer, total_slots integer)
language sql stable security definer set search_path=public,pg_temp as $$
  with m as (select (p_month - (extract(day from p_month)::int - 1)) as first)
  select (m.first + n)::date as day,
         (count(*) filter (where s.available))::int as free_slots,
         (count(s.time_label))::int as total_slots
  from m
  cross join generate_series(0,30) n
  left join lateral public.day_slots(p_service_id, (m.first + n)::date) s on true
  where (m.first + n) < (m.first + interval '1 month')::date
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- 8. Reservar (clienta pública)
-- ---------------------------------------------------------------------------
drop function if exists public.book_appointment(uuid,date,text,text,text,boolean);
create or replace function public.book_appointment(
  p_service_id uuid, p_day date, p_time text, p_name text, p_phone text,
  p_whatsapp_opt_in boolean default false, p_privacy_accepted boolean default false
) returns table(booking_id uuid, token uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_service public.services%rowtype;
  v_set public.salon_settings%rowtype;
  v_name text; v_phone text;
  v_start timestamptz; v_end timestamptz; v_id uuid; v_token uuid;
begin
  v_name := btrim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'));
  v_phone := public.normalize_mx_phone(p_phone);
  if char_length(v_name) not between 2 and 70 or v_name ~ '[<>]' then
    raise exception 'Escribe tu nombre completo (entre 2 y 70 letras).';
  end if;
  if v_phone is null then
    raise exception 'Escribe un número celular mexicano de 10 dígitos.';
  end if;
  if not coalesce(p_privacy_accepted,false) then
    raise exception 'Debes aceptar el aviso de privacidad para reservar.';
  end if;
  if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Selecciona una hora válida.';
  end if;
  select * into v_service from public.services where id=p_service_id and active;
  if not found then raise exception 'Ese servicio ya no está disponible.'; end if;
  select * into v_set from public.salon_settings where id=1;

  if not exists (select 1 from public.day_slots(p_service_id, p_day) where time_label=p_time and available) then
    raise exception 'Ese horario ya no está disponible. Elige otro.';
  end if;
  if (select count(*) from public.bookings
        where phone=v_phone and status='confirmed' and end_at > now()) >= v_set.max_active_per_phone then
    raise exception 'Ya tienes % citas próximas con este número. Escríbenos por WhatsApp para cambios.', v_set.max_active_per_phone;
  end if;
  if (select count(*) from public.bookings
        where created_by='client' and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Hay muchas solicitudes en este momento. Inténtalo de nuevo en unos minutos.';
  end if;

  v_start := (p_day + p_time::time) at time zone 'America/Merida';
  v_end := (p_day + p_time::time + make_interval(mins => v_service.duration_minutes)) at time zone 'America/Merida';
  insert into public.bookings(service_id, client_name, phone, start_at, end_at, whatsapp_opt_in,
                              whatsapp_consent_at, privacy_accepted_at, price_at_booking, created_by)
  values (p_service_id, v_name, v_phone, v_start, v_end, coalesce(p_whatsapp_opt_in,false),
          case when coalesce(p_whatsapp_opt_in,false) then now() end, now(), v_service.price, 'client')
  returning id, booking_token into v_id, v_token;
  booking_id := v_id; token := v_token; return next;
exception when exclusion_violation then
  raise exception 'Otra clienta acaba de reservar ese horario. Elige uno diferente.';
end;$$;

-- ---------------------------------------------------------------------------
-- 9. Comprobante / cancelación por enlace privado (token no adivinable)
-- ---------------------------------------------------------------------------
drop function if exists public.appointment_detail(uuid);
create function public.appointment_detail(p_token uuid)
returns table(client_name text, service_name text, start_at timestamptz, end_at timestamptz,
              duration_minutes integer, price numeric, status text, whatsapp_opt_in boolean,
              can_cancel boolean, cancel_min_hours integer)
language sql stable security definer set search_path=public,pg_temp as $$
  select b.client_name, s.name, b.start_at, b.end_at,
         (extract(epoch from (b.end_at - b.start_at))/60)::int,
         coalesce(b.price_at_booking, s.price), b.status, b.whatsapp_opt_in,
         (b.status='confirmed' and b.start_at - now() >= make_interval(hours => cfg.cancel_min_hours)),
         cfg.cancel_min_hours
  from public.bookings b
  join public.services s on s.id=b.service_id
  cross join public.salon_settings cfg
  where b.booking_token = p_token and cfg.id = 1;
$$;

create or replace function public.cancel_appointment(p_token uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.bookings%rowtype; v_hours integer;
begin
  select * into b from public.bookings where booking_token=p_token for update;
  if not found then return false; end if;
  if b.status <> 'confirmed' then raise exception 'Esta cita ya estaba cancelada.'; end if;
  if b.start_at <= now() then raise exception 'Esta cita ya pasó.'; end if;
  select cancel_min_hours into v_hours from public.salon_settings where id=1;
  if b.start_at - now() < make_interval(hours => v_hours) then
    raise exception 'Para cancelar con menos de % horas de anticipación, escribe al salón por WhatsApp.', v_hours;
  end if;
  update public.bookings
     set status='cancelled', cancelled_at=now(), cancelled_by='client', updated_at=now()
   where id=b.id;
  return true;
end;$$;

create or replace function public.revoke_whatsapp(p_token uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.bookings set whatsapp_opt_in=false, updated_at=now()
   where booking_token=p_token and status='confirmed';
  return found;
end;$$;

-- ---------------------------------------------------------------------------
-- 10. Operaciones de la dueña (solo staff_users)
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_booking(
  p_service_id uuid, p_day date, p_time text, p_name text, p_phone text,
  p_notes text default '', p_ignore_time_off boolean default false
) returns table(booking_id uuid, token uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_service public.services%rowtype; v_name text; v_phone text;
  v_start timestamptz; v_end timestamptz; v_id uuid; v_token uuid;
begin
  perform public.assert_staff();
  v_name := btrim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'));
  v_phone := public.normalize_mx_phone(p_phone);
  if char_length(v_name) not between 2 and 70 then raise exception 'Escribe el nombre de la clienta.'; end if;
  if v_phone is null then raise exception 'El teléfono debe tener 10 dígitos.'; end if;
  if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Hora no válida.'; end if;
  select * into v_service from public.services where id=p_service_id;
  if not found then raise exception 'Servicio no encontrado.'; end if;
  v_start := (p_day + p_time::time) at time zone 'America/Merida';
  v_end := (p_day + p_time::time + make_interval(mins => v_service.duration_minutes)) at time zone 'America/Merida';
  if not coalesce(p_ignore_time_off,false) and exists (
      select 1 from public.time_off t where tstzrange(t.start_at,t.end_at,'[)') && tstzrange(v_start,v_end,'[)')) then
    raise exception 'Ese horario está bloqueado. Quita el bloqueo o confirma que quieres reservar de todos modos.';
  end if;
  insert into public.bookings(service_id, client_name, phone, start_at, end_at, whatsapp_opt_in,
                              price_at_booking, notes, created_by)
  values (p_service_id, v_name, v_phone, v_start, v_end, false, v_service.price, left(coalesce(p_notes,''),500), 'admin')
  returning id, booking_token into v_id, v_token;
  booking_id := v_id; token := v_token; return next;
exception when exclusion_violation then
  raise exception 'Ya hay otra cita en ese horario.';
end;$$;

create or replace function public.admin_reschedule_booking(
  p_booking_id uuid, p_day date, p_time text, p_ignore_time_off boolean default false
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.bookings%rowtype; v_len interval; v_start timestamptz; v_end timestamptz;
begin
  perform public.assert_staff();
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.status <> 'confirmed' then raise exception 'Solo se pueden mover citas confirmadas.'; end if;
  if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Hora no válida.'; end if;
  v_len := b.end_at - b.start_at;
  v_start := (p_day + p_time::time) at time zone 'America/Merida';
  v_end := v_start + v_len;
  if not coalesce(p_ignore_time_off,false) and exists (
      select 1 from public.time_off t where tstzrange(t.start_at,t.end_at,'[)') && tstzrange(v_start,v_end,'[)')) then
    raise exception 'Ese horario está bloqueado.';
  end if;
  -- Una sola sentencia: el horario anterior se libera solo si el nuevo es válido.
  update public.bookings set start_at=v_start, end_at=v_end, updated_at=now() where id=b.id;
  -- Se reprograma el recordatorio: el historial de envíos de la fecha anterior ya no aplica.
  delete from public.reminder_attempts where booking_id=b.id;
exception when exclusion_violation then
  raise exception 'Ya hay otra cita en ese horario.';
end;$$;

create or replace function public.admin_cancel_booking(p_booking_id uuid, p_reason text default '')
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.assert_staff();
  update public.bookings
     set status='cancelled', cancelled_at=now(), cancelled_by='admin',
         cancel_reason=left(coalesce(p_reason,''),300), updated_at=now()
   where id=p_booking_id and status='confirmed';
  return found;
end;$$;

create or replace function public.admin_block_time(
  p_start_day date, p_end_day date,
  p_start_time time default null, p_end_time time default null, p_reason text default ''
) returns table(block_id uuid, affected_bookings integer)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_start timestamptz; v_end timestamptz; v_id uuid; v_aff integer;
begin
  perform public.assert_staff();
  if p_start_day is null or p_end_day is null or p_end_day < p_start_day then
    raise exception 'Revisa las fechas: la final no puede ser anterior a la inicial.';
  end if;
  if p_end_day - p_start_day > 366 then raise exception 'El bloqueo no puede durar más de un año.'; end if;
  if p_start_time is null and p_end_time is null then
    v_start := p_start_day::timestamp at time zone 'America/Merida';
    v_end := (p_end_day + 1)::timestamp at time zone 'America/Merida';
  else
    if p_start_time is null or p_end_time is null or p_end_time <= p_start_time then
      raise exception 'Revisa las horas del bloqueo.';
    end if;
    if p_end_day <> p_start_day then raise exception 'Un bloqueo por horas debe ser de un solo día.'; end if;
    v_start := (p_start_day + p_start_time) at time zone 'America/Merida';
    v_end := (p_start_day + p_end_time) at time zone 'America/Merida';
  end if;
  insert into public.time_off(start_at,end_at,reason) values (v_start, v_end, left(coalesce(p_reason,''),120))
  returning id into v_id;
  select count(*)::int into v_aff from public.bookings b
   where b.status='confirmed' and tstzrange(b.start_at,b.end_at,'[)') && tstzrange(v_start,v_end,'[)');
  block_id := v_id; affected_bookings := v_aff; return next;
end;$$;

-- ---------------------------------------------------------------------------
-- 11. Recordatorios (solo service_role: Edge Function)
-- ---------------------------------------------------------------------------
create or replace function public.reminders_due(p_now timestamptz default now())
returns table(booking_id uuid, booking_token uuid, client_name text, phone text, start_at timestamptz,
              service_name text, whatsapp_opt_in boolean, push_subscriptions integer,
              whatsapp_status text, push_status text)
language sql stable security definer set search_path=public,pg_temp as $$
  select b.id, b.booking_token, b.client_name, b.phone, b.start_at, s.name, b.whatsapp_opt_in,
         (select count(*)::int from public.push_subscriptions p where p.booking_id=b.id),
         (select ra.status from public.reminder_attempts ra where ra.booking_id=b.id and ra.channel='whatsapp'),
         (select ra.status from public.reminder_attempts ra where ra.booking_id=b.id and ra.channel='push')
  from public.bookings b
  join public.services s on s.id=b.service_id
  cross join public.salon_settings cfg
  where cfg.id=1
    and b.status='confirmed'
    and (b.start_at at time zone 'America/Merida')::date = (p_now at time zone 'America/Merida')::date + 1
    and extract(hour from (p_now at time zone 'America/Merida')) >= cfg.reminder_hour
    and extract(hour from (p_now at time zone 'America/Merida')) < 21
    and b.created_at <= p_now - interval '3 hours'
  order by b.start_at;
$$;

create or replace function public.claim_reminder(p_booking_id uuid, p_channel text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_claimed uuid;
begin
  if p_channel not in ('whatsapp','push') then return false; end if;
  -- Nunca reclamar recordatorios de citas canceladas o ya vencidas.
  if not exists (select 1 from public.bookings where id=p_booking_id and status='confirmed' and start_at > now()) then
    return false;
  end if;
  insert into public.reminder_attempts(booking_id,channel,status,attempts,updated_at)
  values (p_booking_id,p_channel,'processing',1,now())
  on conflict (booking_id,channel) do update
    set status='processing', attempts=public.reminder_attempts.attempts+1, updated_at=now(), last_error=null
    where (public.reminder_attempts.status='failed' and public.reminder_attempts.attempts<3)
       or  public.reminder_attempts.status='pending_config'
       or (public.reminder_attempts.status='processing'
           and public.reminder_attempts.updated_at < now() - interval '15 minutes'
           and public.reminder_attempts.attempts<3)
  returning booking_id into v_claimed;
  return v_claimed is not null;
end;$$;

drop function if exists public.finish_reminder(uuid,text,boolean,text);
create or replace function public.finish_reminder(
  p_booking_id uuid, p_channel text, p_ok boolean, p_error text default null, p_message_id text default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.reminder_attempts
     set status = case when p_ok then 'sent' else 'failed' end,
         last_error = left(p_error,400), provider_message_id = left(p_message_id,200), updated_at = now()
   where booking_id=p_booking_id and channel=p_channel and status='processing';
end;$$;

-- Registra, sin fingir envío, por qué NO se envió: 'pending_config' o 'skipped'.
create or replace function public.record_reminder_status(
  p_booking_id uuid, p_channel text, p_status text, p_reason text default ''
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_channel not in ('whatsapp','push') or p_status not in ('pending_config','skipped') then
    raise exception 'Estado de recordatorio no válido.';
  end if;
  insert into public.reminder_attempts(booking_id,channel,status,attempts,updated_at,last_error)
  values (p_booking_id,p_channel,p_status,0,now(),left(p_reason,400))
  on conflict (booking_id,channel) do update
    set status=excluded.status, last_error=excluded.last_error, updated_at=now()
    where public.reminder_attempts.status in ('pending_config','skipped');
end;$$;

create or replace function public.set_integration_status(p_whatsapp boolean, p_push boolean, p_summary jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.integration_status
     set whatsapp_configured=p_whatsapp, push_configured=p_push, last_run_at=now(), last_summary=coalesce(p_summary,'{}'::jsonb)
   where id=1;
  -- Dato público (sin secretos): permite a las clientas ver si el recordatorio automático está activo de verdad.
  update public.salon_settings set whatsapp_reminders_active = coalesce(p_whatsapp,false) where id=1;
end;$$;

-- ---------------------------------------------------------------------------
-- 12. Permisos de ejecución (nada de EXECUTE por omisión para PUBLIC)
-- ---------------------------------------------------------------------------
revoke all on function public.normalize_mx_phone(text) from public;
revoke all on function public.assert_staff() from public, anon;
revoke all on function public.day_slots(uuid,date) from public;
revoke all on function public.available_slots(uuid,date) from public;
revoke all on function public.monthly_availability(uuid,date) from public;
revoke all on function public.book_appointment(uuid,date,text,text,text,boolean,boolean) from public;
revoke all on function public.appointment_detail(uuid) from public;
revoke all on function public.cancel_appointment(uuid) from public;
revoke all on function public.revoke_whatsapp(uuid) from public;
revoke all on function public.register_push(uuid,text,text,text) from public;
revoke all on function public.admin_create_booking(uuid,date,text,text,text,text,boolean) from public, anon;
revoke all on function public.admin_reschedule_booking(uuid,date,text,boolean) from public, anon;
revoke all on function public.admin_cancel_booking(uuid,text) from public, anon;
revoke all on function public.admin_block_time(date,date,time,time,text) from public, anon;
revoke all on function public.reminders_due(timestamptz) from public, anon, authenticated;
revoke all on function public.claim_reminder(uuid,text) from public, anon, authenticated;
revoke all on function public.finish_reminder(uuid,text,boolean,text,text) from public, anon, authenticated;
revoke all on function public.record_reminder_status(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.set_integration_status(boolean,boolean,jsonb) from public, anon, authenticated;

grant execute on function public.day_slots(uuid,date) to anon, authenticated;
grant execute on function public.available_slots(uuid,date) to anon, authenticated;
grant execute on function public.monthly_availability(uuid,date) to anon, authenticated;
grant execute on function public.book_appointment(uuid,date,text,text,text,boolean,boolean) to anon, authenticated;
grant execute on function public.appointment_detail(uuid) to anon, authenticated;
grant execute on function public.cancel_appointment(uuid) to anon, authenticated;
grant execute on function public.revoke_whatsapp(uuid) to anon, authenticated;
grant execute on function public.register_push(uuid,text,text,text) to anon, authenticated;
grant execute on function public.assert_staff() to authenticated;
grant execute on function public.admin_create_booking(uuid,date,text,text,text,text,boolean) to authenticated;
grant execute on function public.admin_reschedule_booking(uuid,date,text,boolean) to authenticated;
grant execute on function public.admin_cancel_booking(uuid,text) to authenticated;
grant execute on function public.admin_block_time(date,date,time,time,text) to authenticated;
grant execute on function public.reminders_due(timestamptz) to service_role;
grant execute on function public.claim_reminder(uuid,text) to service_role;
grant execute on function public.finish_reminder(uuid,text,boolean,text,text) to service_role;
grant execute on function public.record_reminder_status(uuid,text,text,text) to service_role;
grant execute on function public.set_integration_status(boolean,boolean,jsonb) to service_role;

-- La dueña puede leer los datos de su cuenta y editar la configuración (RLS: solo staff).
grant update on public.salon_settings to authenticated;
grant update on public.working_hours to authenticated;
grant insert, update on public.services to authenticated;
grant select, insert, update, delete on public.time_off to authenticated;
