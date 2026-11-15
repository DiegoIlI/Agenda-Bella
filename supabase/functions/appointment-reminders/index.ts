// Edge Function: recordatorios automáticos (WhatsApp Cloud API + Web Push).
// Se invoca por cron (pg_cron/GitHub Actions) con POST y el encabezado x-cron-secret.
// La lógica vive en lib.js (probada con node --test). Aquí solo hay conexión con Supabase y web-push.
// Secretos (WA_*, VAPID_*, CRON_SECRET, SERVICE_ROLE) viven SOLO en los "secrets" de Supabase, nunca en el frontend.
import { createClient } from 'npm:@supabase/supabase-js@2.49.0';
import webpush from 'npm:web-push@3.6.7';
import { readConfig, runReminders, safeEqual } from './lib.js';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const cfg = readConfig((k: string) => Deno.env.get(k));
  if (!cfg.cronSecret || !safeEqual(req.headers.get('x-cron-secret'), cfg.cronSecret)) return new Response('Unauthorized', { status: 401 });
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Falta configurar Supabase', { status: 500 });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  if (cfg.pushReady) webpush.setVapidDetails(cfg.vapid.subject, cfg.vapid.pub, cfg.vapid.priv);
  const db = {
    rpc: (name: string, args: unknown) => sb.rpc(name, args as never),
    pushSubs: async (id: string) => (await sb.from('push_subscriptions').select('id,endpoint,p256dh,auth_key').eq('booking_id', id)).data ?? [],
    deleteSub: async (id: string) => { await sb.from('push_subscriptions').delete().eq('id', id); },
  };
  try {
    const result = await runReminders({
      db, cfg, fetchImpl: fetch,
      sendPush: (s: { endpoint: string; p256dh: string; auth_key: string }, payload: string) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, payload),
    });
    return Response.json(result);
  } catch (e) {
    console.error('appointment-reminders', (e as Error).message);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
