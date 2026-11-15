\set ON_ERROR_STOP on
\pset pager off
-- ===== Preparación =====
\set staff '11111111-1111-1111-1111-111111111111'
\set other '22222222-2222-2222-2222-222222222222'
insert into auth.users(id,email) values ('11111111-1111-1111-1111-111111111111','duena@test.mx'),('22222222-2222-2222-2222-222222222222','intrusa@test.mx');
insert into public.staff_users(user_id) values ('11111111-1111-1111-1111-111111111111');
select id as balayage from public.services where name='Mechas / Balayage' \gset
select id as corte from public.services where name='Corte de cabello' \gset
-- Primer martes a 4+ días (martes abierto 09:00-19:00)
select (d)::text as d from (select (current_date + n) d from generate_series(4,20) n where extract(dow from current_date+n)=2 limit 1) x \gset
select (:'d'::date + 1)::text as d2, (:'d'::date + 5)::text as sun \gset
select (:'d'::date - extract(dow from :'d'::date)::int)::text as sun2 \gset
-- DOM = un domingo (cerrado)
select (current_date + 8 - extract(dow from current_date + 8)::int)::text as dom \gset

-- ===== 1. Seguridad / RLS =====
select t.check('anon NO puede leer bookings', t.run_as('anon',null,'select * from public.bookings limit 1') ilike '%permission denied%');
select t.check('anon NO puede insertar bookings', t.run_as('anon',null,format($q$insert into public.bookings(service_id,client_name,phone,start_at,end_at) values (%L,'X Y','9990000000',now()+interval '3 days',now()+interval '3 days 1 hour')$q$,:'corte')) ilike '%permission denied%');
select t.check('anon NO puede leer push_subscriptions', t.run_as('anon',null,'select * from public.push_subscriptions') ilike '%permission denied%');
select t.check('anon NO puede leer reminder_attempts', t.run_as('anon',null,'select * from public.reminder_attempts') ilike '%permission denied%');
select t.check('anon NO puede leer time_off', t.run_as('anon',null,'select * from public.time_off') ilike '%permission denied%');
select t.check('anon NO puede leer staff_users', t.run_as('anon',null,'select * from public.staff_users') ilike '%permission denied%');
select t.check('anon NO puede modificar services', t.run_as('anon',null,'update public.services set price=1') ilike '%permission denied%');
select t.check('anon NO puede modificar salon_settings', t.run_as('anon',null,'update public.salon_settings set whatsapp_phone=''9990000000''') ilike '%permission denied%');
select t.check('anon puede leer servicios activos', t.scalar_as('anon',null,'select count(*)::text from public.services')::int >= 8);
select t.check('anon NO puede ejecutar admin_create_booking', t.run_as('anon',null,format($q$select * from public.admin_create_booking(%L,%L,'10:00','A B','9990000000')$q$,:'corte',:'d')) ilike '%permission denied%');
select t.check('anon NO puede ejecutar reminders_due', t.run_as('anon',null,'select * from public.reminders_due()') ilike '%permission denied%');
select t.check('anon NO puede ejecutar claim_reminder', t.run_as('anon',null,format($q$select public.claim_reminder(gen_random_uuid(),'whatsapp')$q$)) ilike '%permission denied%');
select t.check('autenticada NO staff: admin_create_booking → No autorizado', t.run_as('authenticated',:'other',format($q$select * from public.admin_create_booking(%L,%L,'10:00','A B','9990000000')$q$,:'corte',:'d')) ilike '%No autorizado%');
select t.check('autenticada NO staff: admin_block_time → No autorizado', t.run_as('authenticated',:'other',format($q$select * from public.admin_block_time(%L,%L)$q$,:'d',:'d')) ilike '%No autorizado%');
select t.check('autenticada NO staff: no ve bookings', t.scalar_as('authenticated',:'other','select count(*)::text from public.bookings')='0');
select t.check('autenticada NO staff: no puede actualizar services', t.scalar_as('authenticated',:'other','with u as (update public.services set price=1 returning 1) select count(*)::text from u')='0');
select t.check('autenticada NO staff: no puede actualizar settings', t.scalar_as('authenticated',:'other','with u as (update public.salon_settings set tagline=''x'' returning 1) select count(*)::text from u')='0');
select t.check('autenticada NO staff: no ve integration_status', t.scalar_as('authenticated',:'other','select count(*)::text from public.integration_status')='0');
select t.check('authenticated NO puede insertar bookings directo', t.run_as('authenticated',:'staff',format($q$insert into public.bookings(service_id,client_name,phone,start_at,end_at) values (%L,'X Y','9990000000',now()+interval '3 days',now()+interval '3 days 1 hour')$q$,:'corte')) ilike '%permission denied%');

-- ===== 2. Disponibilidad pública =====
select t.check('día cerrado (domingo) sin horarios', (select count(*) from public.day_slots(:'corte',:'dom'::date))=0);
select t.check('día pasado sin horarios', (select count(*) from public.day_slots(:'corte',(current_date-1)))=0);
select t.check('fuera de ventana (60 días) sin horarios', (select count(*) from public.day_slots(:'corte',(current_date+90)))=0);
select t.check('martes abierto: corte 45min cada 30 → primer 09:00 último 18:00', (select min(time_label)||'-'||max(time_label) from public.day_slots(:'corte',:'d'::date))='09:00-18:00');
select t.check('balayage 180 min: último inicio 16:00', (select max(time_label) from public.day_slots(:'balayage',:'d'::date))='16:00');
select t.check('anon puede consultar day_slots', t.scalar_as('anon',null,format($q$select count(*)::text from public.day_slots(%L,%L)$q$,:'corte',:'d'))::int>0);
select t.check('monthly_availability: 28-31 filas, con total_slots', (select count(*) between 28 and 31 from public.monthly_availability(:'corte',:'d'::date)));
select t.check('monthly_availability marca domingo con total 0', (select total_slots from public.monthly_availability(:'corte',:'dom'::date) where day=:'dom'::date)=0);

-- ===== 3. Reserva clienta A (balayage 10:00-13:00) y bloqueo de TODO el intervalo =====
select token::text as toka from public.book_appointment(:'balayage',:'d'::date,'10:00','Ana López','+52 999 123 4567',true,true) \gset
select t.check('reserva A creada', :'toka' is not null);
select t.check('teléfono normalizado a 10 dígitos', (select phone from public.bookings where booking_token=:'toka'::uuid)='9991234567');
select t.check('consentimiento WhatsApp registrado con fecha', (select whatsapp_consent_at is not null and whatsapp_opt_in from public.bookings where booking_token=:'toka'::uuid));
select t.check('precio congelado al reservar', (select price_at_booking from public.bookings where booking_token=:'toka'::uuid)=1200);
select t.check('duración guardada = 180 min', (select extract(epoch from end_at-start_at)/60 from public.bookings where booking_token=:'toka'::uuid)=180);
select t.check('teléfono B ve 10:00 NO disponible (balayage)', (select not available from public.day_slots(:'balayage',:'d'::date) where time_label='10:00'));
select t.check('teléfono B: corte 10:00/10:30/11:00/12:00/12:30 bloqueados', (select bool_and(not available) from public.day_slots(:'corte',:'d'::date) where time_label in ('10:00','10:30','11:00','11:30','12:00','12:30')));
select t.check('corte 09:30 (termina 10:15) bloqueado por solape', (select not available from public.day_slots(:'corte',:'d'::date) where time_label='09:30'));
select t.check('corte 09:00 (termina 09:45) disponible', (select available from public.day_slots(:'corte',:'d'::date) where time_label='09:00'));
select t.check('corte 13:00 (justo al terminar) disponible', (select available from public.day_slots(:'corte',:'d'::date) where time_label='13:00'));
select t.check('balayage 09:00 bloqueado (se enciman 10-12)', (select not available from public.day_slots(:'balayage',:'d'::date) where time_label='09:00'));
select t.check('balayage 13:00 disponible', (select available from public.day_slots(:'balayage',:'d'::date) where time_label='13:00'));
select t.check('available_slots excluye ocupados', (select count(*) from public.available_slots(:'corte',:'d'::date) where time_label='10:30')=0);
select t.check('monthly: el día de A sigue con cupo pero menos', (select free_slots from public.monthly_availability(:'corte',:'d'::date) where day=:'d'::date) < (select total_slots from public.monthly_availability(:'corte',:'d'::date) where day=:'d'::date));
select t.check('B no puede reservar el mismo horario', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'10:00','Beatriz Ruiz','9997654321',false,true)$q$,:'corte',:'d')) ilike '%ya no está disponible%');
select t.check('B no puede reservar 11:00 (dentro del balayage)', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'11:00','Beatriz Ruiz','9997654321',false,true)$q$,:'corte',:'d')) ilike '%ya no está disponible%');
select t.check('anon: day_slots devuelve solo 2 columnas', (select count(*) from information_schema.routines r join information_schema.parameters p on p.specific_name=r.specific_name where r.routine_name='day_slots' and p.parameter_mode='OUT')=2);
select token::text as tokb from public.book_appointment(:'corte',:'d'::date,'13:00','Beatriz Ruiz','9997654321',false,true) \gset
select t.check('reserva adyacente B 13:00 permitida', :'tokb' is not null);

-- ===== 4. Validaciones =====
select t.check('nombre muy corto rechazado', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'14:00','A','9997654321',false,true)$q$,:'corte',:'d')) ilike '%nombre%');
select t.check('teléfono inválido rechazado', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'14:00','Carla Díaz','12345',false,true)$q$,:'corte',:'d')) ilike '%10 dígitos%');
select t.check('sin aviso de privacidad rechazado', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'14:00','Carla Díaz','9990001111',false,false)$q$,:'corte',:'d')) ilike '%privacidad%');
select t.check('hora malformada rechazada', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'25:99','Carla Díaz','9990001111',false,true)$q$,:'corte',:'d')) ilike '%hora válida%');
select t.check('hora fuera de rejilla/horario (07:00) rechazada', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'07:00','Carla Díaz','9990001111',false,true)$q$,:'corte',:'d')) ilike '%ya no está disponible%');
select t.check('hora fuera de rejilla (10:10 no es múltiplo)', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'14:10','Carla Díaz','9990001111',false,true)$q$,:'corte',:'d')) ilike '%ya no está disponible%');
select t.check('domingo cerrado rechazado', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'10:00','Carla Díaz','9990001111',false,true)$q$,:'corte',:'dom')) ilike '%ya no está disponible%');
select t.check('nombre con < > rechazado', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'14:00','<b>Hack</b>','9990001111',false,true)$q$,:'corte',:'d')) ilike '%nombre%');
select token::text as tokc from public.book_appointment(:'corte',:'d'::date,'15:00','  Carla   Díaz ','(52) 1 999 000 1111',false,true) \gset
select t.check('nombre normalizado (espacios) y tel 521 normalizado', (select client_name||'|'||phone from public.bookings where booking_token=:'tokc'::uuid)='Carla Díaz|9990001111');
select t.check('sin opt-in: whatsapp_opt_in=false y sin fecha de consentimiento', (select not whatsapp_opt_in and whatsapp_consent_at is null from public.bookings where booking_token=:'tokc'::uuid));

-- ===== 5. Límite por teléfono / anti-spam =====
select * from public.book_appointment(:'corte',:'d'::date,'16:00','Dora Mena','9995550000',false,true) \gset
select * from public.book_appointment(:'corte',:'d2'::date,'10:00','Dora Mena','9995550000',false,true) \gset
select * from public.book_appointment(:'corte',:'d2'::date,'12:00','Dora Mena','9995550000',false,true) \gset
select t.check('4ª cita activa del mismo teléfono rechazada (límite 3)', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'14:00','Dora Mena','9995550000',false,true)$q$,:'corte',:'d2')) ilike '%citas próximas%');

-- ===== 6. Comprobante y cancelación por token =====
select t.check('appointment_detail con token: nombre, servicio, duración, precio, estado', (select client_name='Ana López' and service_name='Mechas / Balayage' and duration_minutes=180 and price=1200 and status='confirmed' and can_cancel from public.appointment_detail(:'toka'::uuid)));
select t.check('token desconocido no devuelve nada', (select count(*) from public.appointment_detail(gen_random_uuid()))=0);
select t.check('cancelar token inexistente devuelve false', (select public.cancel_appointment(gen_random_uuid()))=false);
-- Cita propia en un día laborable cercano (<7 días) para que la prueba no dependa de la fecha de hoy.
select (current_date + n)::text as dnear from generate_series(2,6) n where extract(dow from current_date+n) between 1 and 5 limit 1 \gset
select token::text as tokn from public.book_appointment(:'corte',:'dnear'::date,'10:00','Nora Cercana','9990009999',false,true) \gset
update public.salon_settings set cancel_min_hours=168 where id=1;
select t.check('cancelación bloqueada si falta < min de horas', t.run_as('anon',null,format($q$select public.cancel_appointment(%L)$q$,:'tokn')) ilike '%menos de 168 horas%');
select t.check('detail.can_cancel=false dentro de la ventana prohibida', (select not can_cancel from public.appointment_detail(:'tokn'::uuid)));
delete from public.bookings where booking_token=:'tokn'::uuid;
update public.salon_settings set cancel_min_hours=3 where id=1;
select t.check('anon cancela con token válido', t.run_as('anon',null,format($q$select public.cancel_appointment(%L)$q$,:'toka'))='ok');
select t.check('tras cancelar A, 10:00 vuelve a estar disponible', (select available from public.day_slots(:'balayage',:'d'::date) where time_label='10:00'));
select t.check('cancelar dos veces → error claro', t.run_as('anon',null,format($q$select public.cancel_appointment(%L)$q$,:'toka')) ilike '%ya estaba cancelada%');
select t.check('estado cancelled + cancelled_by=client', (select status='cancelled' and cancelled_by='client' and cancelled_at is not null from public.bookings where booking_token=:'toka'::uuid));
select token::text as toka2 from public.book_appointment(:'balayage',:'d'::date,'10:00','Ana López','9991234567',true,true) \gset
select t.check('horario liberado puede reservarse otra vez', :'toka2' is not null);

-- ===== 7. Descansos =====
update public.working_hours set break_start='14:00', break_end='15:00' where weekday=2;
select t.check('con descanso 14-15: corte 13:30 (termina 14:15) no se ofrece', (select count(*) from public.day_slots(:'corte',:'d'::date) where time_label in ('13:30','14:00','14:30'))=0);
select t.check('con descanso: 13:00 y 15:00 sí se ofrecen', (select count(*) from public.day_slots(:'corte',:'d'::date) where time_label in ('13:00','15:00'))=2);
update public.working_hours set break_start=null, break_end=null where weekday=2;

-- ===== 8. Intervalo de inicio configurable =====
update public.salon_settings set slot_interval_minutes=60 where id=1;
select t.check('intervalo 60: solo horas en punto', (select count(*) from public.day_slots(:'corte',:'d'::date) where time_label like '%:30')=0);
update public.salon_settings set slot_interval_minutes=30 where id=1;

-- ===== 9. Dueña bloquea día / horas / vacaciones =====
select set_config('request.jwt.claim.sub', :'staff', false) \gset x_
select * from public.admin_block_time(:'d2'::date,:'d2'::date,null,null,'Feriado') \gset
select t.check('blocked: nadie puede elegir el día completo', (select count(*) from public.day_slots(:'corte',:'d2'::date) where available)=0 and (select count(*)>0 from public.day_slots(:'corte',:'d2'::date)));
select t.check('blocked: reservar falla', t.run_as('anon',null,format($q$select * from public.book_appointment(%L,%L,'10:00','Eva Pech','9990009999',false,true)$q$,:'corte',:'d2')) ilike '%ya no está disponible%');
select t.check('monthly: día bloqueado con free_slots=0 pero total>0 (ocupado)', (select free_slots=0 and total_slots>0 from public.monthly_availability(:'corte',:'d2'::date) where day=:'d2'::date));
delete from public.time_off;   -- (como superusuario) limpiar
select * from public.admin_block_time(:'d'::date,:'d'::date,'10:00','13:00','Cita médica') \gset
select t.check('admin_block_time informa citas afectadas', :'affected_bookings'::int>=1, :'affected_bookings');
select t.check('bloqueo por horas: 12:30 no disponible, 13:30 sí', (select not available from public.day_slots(:'corte',:'d'::date) where time_label='12:30') and (select available from public.day_slots(:'corte',:'d'::date) where time_label='14:00'));
delete from public.time_off;
select * from public.admin_block_time((:'d'::date+7),(:'d'::date+9),null,null,'Vacaciones') \gset
select t.check('vacaciones multi-día bloquean los 3 días', (select count(*) from public.day_slots(:'corte',(:'d'::date+7)) where available)=0 and (select count(*) from public.day_slots(:'corte',(:'d'::date+8)) where available)=0 and (select count(*) from public.day_slots(:'corte',(:'d'::date+9)) where available)=0);
select t.check('fin de vacaciones: día siguiente libre', (select count(*) from public.day_slots(:'corte',(:'d'::date+10)) where available)>0);
select t.check('admin_block_time rechaza fechas invertidas', t.run_as('authenticated',:'staff',format($q$select * from public.admin_block_time(%L,%L)$q$,(:'d'::date+3),:'d')) ilike '%fecha%');
delete from public.time_off;

-- ===== 10. Operaciones de la dueña =====
select t.check('staff ve bookings', t.scalar_as('authenticated',:'staff','select count(*)::text from public.bookings')::int>=4);
select token::text as tokm from public.admin_create_booking(:'corte',:'d'::date,'17:00','Mamá Cliente','9993331111','llamó por teléfono') \gset
select t.check('admin crea cita manual (origen admin, sin consentimiento WA)', (select created_by='admin' and not whatsapp_opt_in and notes='llamó por teléfono' from public.bookings where booking_token=:'tokm'::uuid));
select t.check('admin no puede crear sobre otra cita', t.run_as('authenticated',:'staff',format($q$select * from public.admin_create_booking(%L,%L,'10:30','Zoe Ek','9990008888')$q$,:'corte',:'d')) ilike '%otra cita%');
select id as mid from public.bookings where booking_token=:'tokm'::uuid \gset
select t.run_as('authenticated',:'staff',format($q$select public.admin_reschedule_booking(%L,%L,'18:00')$q$,:'mid',:'d')) as r \gset
select t.check('admin reprograma a hora libre', :'r'='ok' and (select to_char(start_at at time zone 'America/Merida','HH24:MI')='18:00' from public.bookings where id=:'mid'::uuid));
select t.run_as('authenticated',:'staff',format($q$select public.admin_reschedule_booking(%L,%L,'10:30')$q$,:'mid',:'d')) as r \gset
select t.check('reprogramar a hora ocupada falla y conserva la original', :'r' ilike '%otra cita%' and (select to_char(start_at at time zone 'America/Merida','HH24:MI')='18:00' from public.bookings where id=:'mid'::uuid));
select t.scalar_as('authenticated',:'staff',format($q$select public.admin_cancel_booking(%L,'clienta no puede')::text$q$,:'mid')) as r \gset
select t.check('admin cancela cita', :'r'='true' and (select status='cancelled' and cancelled_by='admin' and cancel_reason='clienta no puede' from public.bookings where id=:'mid'::uuid));
select t.check('cita cancelada por admin libera 18:00', (select available from public.day_slots(:'corte',:'d'::date) where time_label='18:00'));
select t.run_as('authenticated',:'staff',format($q$update public.services set price=1500 where id=%L$q$,:'balayage')) as r \gset
select t.scalar_as('anon',null,format($q$select price::text from public.services where id=%L$q$,:'balayage')) as p \gset
select t.check('staff puede cambiar precio; público lo ve', :'r'='ok' and :'p'='1500.00', :'p');
select t.check('staff edita ajustes (WhatsApp)', t.run_as('authenticated',:'staff',$q$update public.salon_settings set whatsapp_phone='9997666778' where id=1$q$)='ok');
select t.check('número del salón rechaza basura', t.run_as('authenticated',:'staff',$q$update public.salon_settings set whatsapp_phone='abc' where id=1$q$) ilike '%violates check%');
select t.run_as('authenticated',:'staff',format($q$update public.services set active=false where id=%L$q$,:'corte')) as r \gset
select t.scalar_as('anon',null,format($q$select count(*)::text from public.services where id=%L$q$,:'corte')) as c \gset
select t.check('servicio desactivado desaparece para anon', :'r'='ok' and :'c'='0' and (select count(*) from public.day_slots(:'corte',:'d'::date))=0);
update public.services set active=true where id=:'corte'::uuid;
select t.check('staff puede crear servicio', t.run_as('authenticated',:'staff',$q$insert into public.services(name,category,price,duration_minutes,icon) values ('Uñas gel','Uñas',350,90,'polish')$q$)='ok');
select t.check('staff NO puede borrar servicios', t.run_as('authenticated',:'staff',$q$delete from public.services$q$) ilike '%permission denied%');

-- ===== 11. Recordatorios =====
-- Cita de mañana-relativa: usamos A2 (D 10:00, balayage, opt-in) y C (sin opt-in).
select id as aid from public.bookings where booking_token=:'toka2'::uuid \gset
select id as cid from public.bookings where booking_token=:'tokc'::uuid \gset
update public.bookings set created_at=now()-interval '2 days';
select ((:'d'::date - 1)::timestamp + time '09:30') at time zone 'America/Merida' as t_ok \gset
select ((:'d'::date - 1)::timestamp + time '08:00') at time zone 'America/Merida' as t_early \gset
select ((:'d'::date - 1)::timestamp + time '21:30') at time zone 'America/Merida' as t_late \gset
select ((:'d'::date - 2)::timestamp + time '09:30') at time zone 'America/Merida' as t_2d \gset
select t.check('recordatorio: el día anterior a las 09:30 hay citas pendientes', (select count(*) from public.reminders_due(:'t_ok'::timestamptz))>=2);
select t.check('recordatorio: antes de la hora configurada (08:00) no hay', (select count(*) from public.reminders_due(:'t_early'::timestamptz))=0);
select t.check('recordatorio: de noche (21:30) no hay', (select count(*) from public.reminders_due(:'t_late'::timestamptz))=0);
select t.check('recordatorio: dos días antes no hay', (select count(*) from public.reminders_due(:'t_2d'::timestamptz))=0);
select t.check('cita cancelada NO aparece en reminders_due', (select count(*) from public.reminders_due(:'t_ok'::timestamptz) where booking_id=:'toka'::uuid or booking_id=(select id from public.bookings where booking_token=:'toka'::uuid))=0);
with n as (insert into public.bookings(service_id,client_name,phone,start_at,end_at,created_at) values (:'corte'::uuid,'Reciente','9990004444',(:'d'::date::timestamp + time '20:00') at time zone 'America/Merida',(:'d'::date::timestamp + time '20:45') at time zone 'America/Merida',:'t_ok'::timestamptz - interval '1 hour'),(:'corte'::uuid,'Antigua','9990004445',(:'d'::date::timestamp + time '21:00') at time zone 'America/Merida',(:'d'::date::timestamp + time '21:45') at time zone 'America/Merida',:'t_ok'::timestamptz - interval '4 hours') returning id) select count(*) as nn from n \gset
select t.check('recién creada (<3h) no se recuerda; la de 4h sí', (select count(*) from public.reminders_due(:'t_ok'::timestamptz) where client_name='Reciente')=0 and (select count(*) from public.reminders_due(:'t_ok'::timestamptz) where client_name='Antigua')=1);
select t.check('claim whatsapp #1 = true', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'aid'))='true');
select t.check('claim whatsapp #2 (duplicado) = false', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'aid'))='false');
select t.run_as('service_role',null,format($q$select public.finish_reminder(%L,'whatsapp',true,null,'wamid.TEST')$q$,:'aid')) as r \gset
select t.check('finish ok → sent', :'r'='ok' and (select status='sent' and provider_message_id='wamid.TEST' from public.reminder_attempts where booking_id=:'aid'::uuid and channel='whatsapp'));
select t.check('ya enviado no se reclama de nuevo', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'aid'))='false');
select t.check('reminders_due refleja estado enviado', (select whatsapp_status from public.reminders_due(:'t_ok'::timestamptz) where booking_id=:'aid')='sent');
-- fallo y reintentos (máx 3)
select t.run_as('service_role',null,format($q$select public.record_reminder_status(%L,'whatsapp','skipped','sin consentimiento')$q$,:'cid')) as r \gset
select t.check('C (sin opt-in): registrar skipped', :'r'='ok' and (select status from public.reminder_attempts where booking_id=:'cid'::uuid and channel='whatsapp')='skipped');
select t.check('skipped no se reclama', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'cid'))='false');
select id as eid from (select id from public.bookings where booking_token=:'tokb'::uuid) q \gset
select t.run_as('service_role',null,format($q$select public.record_reminder_status(%L,'whatsapp','pending_config','faltan credenciales Meta')$q$,:'eid')) as r \gset
select t.check('pendiente de configuración queda registrado (no "sent")', :'r'='ok' and (select status='pending_config' from public.reminder_attempts where booking_id=:'eid'::uuid and channel='whatsapp'));
select t.check('pending_config se puede reclamar cuando ya hay credenciales', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'eid'))='true');
select t.run_as('service_role',null,format($q$select public.finish_reminder(%L,'whatsapp',false,'HTTP 500')$q$,:'eid'));
select t.check('fallo → failed con error registrado', (select status='failed' and last_error='HTTP 500' from public.reminder_attempts where booking_id=:'eid' and channel='whatsapp'));
select t.check('failed se reintenta (intento 2)', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'eid'))='true');
select t.run_as('service_role',null,format($q$select public.finish_reminder(%L,'whatsapp',false,'HTTP 500')$q$,:'eid'));
select t.check('failed se reintenta (intento 3)', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'eid'))='true');
select t.run_as('service_role',null,format($q$select public.finish_reminder(%L,'whatsapp',false,'HTTP 500')$q$,:'eid'));
select t.check('después de 3 fallos ya no se reintenta', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,:'eid'))='false');
-- cancelada no se reclama; reprogramar reinicia
select t.check('cita cancelada no se puede reclamar', t.scalar_as('service_role',null,format($q$select public.claim_reminder(%L,'whatsapp')::text$q$,(select id from public.bookings where booking_token=:'toka'::uuid)))='false');
select t.run_as('authenticated',:'staff',format($q$select public.admin_reschedule_booking(%L,%L,'09:00')$q$,:'aid',:'d')) as r \gset
select t.check('reprogramar borra el historial de envíos (se vuelve a programar)', :'r'='ok' and (select count(*) from public.reminder_attempts where booking_id=:'aid'::uuid)=0);
select t.run_as('service_role',null,$q$select public.set_integration_status(false,false,'{"x":1}')$q$) as r \gset
select t.check('whatsapp_reminders_active sigue false si Meta no está configurado', (select not whatsapp_reminders_active from public.salon_settings where id=1));
select t.run_as('service_role',null,$q$select public.set_integration_status(true,false,'{}')$q$) as r0 \gset
select t.check('set_integration_status(true) publica el estado para las clientas', (select whatsapp_reminders_active from public.salon_settings where id=1) and t.scalar_as('anon',null,'select whatsapp_reminders_active::text from public.salon_settings')='true');
select t.run_as('service_role',null,$q$select public.set_integration_status(false,false,'{"x":1}')$q$) as r0 \gset
select t.check('integration_status: service_role lo actualiza; staff lo lee; no-staff no', :'r'='ok' and t.scalar_as('authenticated',:'staff','select count(*)::text from public.integration_status')='1' and t.scalar_as('authenticated',:'other','select count(*)::text from public.integration_status')='0');
select t.check('staff lee reminder_attempts; no-staff no', t.scalar_as('authenticated',:'staff','select (count(*)>0)::text from public.reminder_attempts')='true' and t.scalar_as('authenticated',:'other','select count(*)::text from public.reminder_attempts')='0');

-- ===== 12. Notificaciones push (registro) =====
select t.check('register_push exige https y llaves', t.run_as('anon',null,format($q$select public.register_push(%L,'http://x','a','b')$q$,:'tokb')) ilike '%no válida%');
select t.check('register_push válido', t.run_as('anon',null,format($q$select public.register_push(%L,'https://push.example/abcdefghijklmnopqrstuvwxyz','p256dhp256dhp256dhp256dh','authauthauth')$q$,:'tokb'))='ok');
select t.check('anon no lee suscripciones push', t.run_as('anon',null,'select * from public.push_subscriptions') ilike '%permission denied%');

-- ===== 13. Realtime =====
select t.check('bookings publicada en supabase_realtime', exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='bookings'));

-- ===== Resultado =====
select case when ok then 'PASS' else 'FAIL' end as r, n, name, detail from t.log order by n;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail from t.log;
