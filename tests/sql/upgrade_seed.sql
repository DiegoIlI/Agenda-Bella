-- Datos "de la vida real" creados con la v2 original, antes de migrar.
insert into public.bookings(service_id,client_name,phone,start_at,end_at,whatsapp_opt_in)
select s.id,'Ana Rodríguez','9990000001',(current_date+3)::timestamp at time zone 'America/Merida'+interval '10 hours',(current_date+3)::timestamp at time zone 'America/Merida'+interval '10 hours'+make_interval(mins=>s.duration_minutes),true from public.services s where name='Manicura';
insert into public.bookings(service_id,client_name,phone,start_at,end_at,whatsapp_opt_in)
select s.id,'María López','9990000002',(current_date+3)::timestamp at time zone 'America/Merida'+interval '12 hours',(current_date+3)::timestamp at time zone 'America/Merida'+interval '12 hours'+make_interval(mins=>s.duration_minutes),false from public.services s where name='Mechas / Balayage';
insert into public.bookings(service_id,client_name,phone,start_at,end_at,whatsapp_opt_in,status)
select s.id,'Sofía Pérez','9990000003',(current_date+4)::timestamp at time zone 'America/Merida'+interval '10 hours',(current_date+4)::timestamp at time zone 'America/Merida'+interval '11 hours',true,'cancelled' from public.services s where name='Corte de cabello';
update public.services set price=999 where name='Pedicura';
