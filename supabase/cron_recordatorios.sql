-- Programa la ejecución automática de la función de recordatorios (Supabase: Database > Extensions > activar pg_cron y pg_net).
-- 1) Reemplaza TU_PROYECTO y TU_CRON_SECRET (el mismo valor que pondrás en los secrets de la Edge Function).
-- 2) Ejecuta este archivo UNA vez en el SQL Editor. No lo subas a GitHub con el secreto real.
-- La función decide sola si toca enviar (día anterior, a partir de la hora configurada en Ajustes, antes de las 21:00 de Mérida),
-- y nunca envía dos veces el mismo recordatorio.
select cron.unschedule('agenda-bella-recordatorios') where exists (select 1 from cron.job where jobname='agenda-bella-recordatorios');
select cron.schedule(
  'agenda-bella-recordatorios',
  '*/30 * * * *',
  $$ select net.http_post(
       url     := 'https://TU_PROYECTO.supabase.co/functions/v1/appointment-reminders',
       headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','TU_CRON_SECRET'),
       body    := '{}'::jsonb
     ); $$
);
