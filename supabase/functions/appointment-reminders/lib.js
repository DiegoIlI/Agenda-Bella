// Lógica pura y comprobable de los recordatorios (sin Deno ni red directa).
// Se importa desde index.ts (Edge Function) y desde tests/unit (node --test).
export const TZ = 'America/Merida';

/** Teléfono mexicano -> formato internacional sin "+" (52XXXXXXXXXX). Devuelve null si no es válido. */
export function toWhatsAppNumber(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return '52' + d;
  if (d.length === 12 && d.startsWith('52')) return d;
  if (d.length === 13 && d.startsWith('521')) return '52' + d.slice(3);
  return null;
}

export function formatDateEs(iso) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}
export function formatTimeEs(iso) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(/\s/g, ' ');
}

/** Comparación en tiempo constante (evita filtrar el secreto por tiempos de respuesta). */
export function safeEqual(a, b) {
  const x = String(a ?? ''), y = String(b ?? '');
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0 && x.length > 0;
}

/** Lee la configuración del entorno. Nunca devuelve secretos al exterior: solo se usa dentro de la función. */
export function readConfig(get) {
  const g = k => (get(k) || '').trim();
  const wa = { token: g('WA_ACCESS_TOKEN'), phoneId: g('WA_PHONE_NUMBER_ID'), template: g('WA_TEMPLATE_NAME'), lang: g('WA_TEMPLATE_LANGUAGE') || 'es_MX', graph: g('WA_GRAPH_VERSION') || 'v21.0' };
  const vapid = { pub: g('VAPID_PUBLIC_KEY'), priv: g('VAPID_PRIVATE_KEY'), subject: g('VAPID_SUBJECT') };
  return {
    cronSecret: g('CRON_SECRET'), appUrl: g('APP_PUBLIC_URL'), wa, vapid,
    whatsappReady: !!(wa.token && wa.phoneId && wa.template),
    pushReady: !!(vapid.pub && vapid.priv && vapid.subject),
  };
}

/**
 * Mensaje de plantilla (tipo UTILITY) de la WhatsApp Cloud API.
 * Cuerpo sugerido para aprobar en Meta (4 variables):
 *   "Hola {{1}}, te recordamos tu cita de {{2}} el {{3}} a las {{4}}. ¡Te esperamos!"
 */
export function buildTemplatePayload(row, cfg) {
  const to = toWhatsAppNumber(row.phone);
  if (!to) throw new Error('Teléfono no válido para WhatsApp.');
  const text = v => ({ type: 'text', text: String(v).slice(0, 60) });
  return {
    messaging_product: 'whatsapp', to, type: 'template',
    template: {
      name: cfg.wa.template, language: { code: cfg.wa.lang },
      components: [{ type: 'body', parameters: [text(row.client_name.split(' ')[0]), text(row.service_name), text(formatDateEs(row.start_at)), text(formatTimeEs(row.start_at))] }],
    },
  };
}

export async function sendWhatsApp(fetchImpl, row, cfg) {
  const res = await fetchImpl(`https://graph.facebook.com/${cfg.wa.graph}/${cfg.wa.phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${cfg.wa.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildTemplatePayload(row, cfg)),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${text.replace(cfg.wa.token, '***').slice(0, 200)}`);
  let id = null; try { id = JSON.parse(text)?.messages?.[0]?.id ?? null; } catch { /* sin id */ }
  return id;
}

export function pushPayload(row, cfg) {
  return JSON.stringify({
    title: 'Agenda Bella · Tu cita es mañana ✨',
    body: `${row.service_name} · ${formatTimeEs(row.start_at)}. ¡Te esperamos!`,
    url: `${cfg.appUrl}#/cita/${row.booking_token}`, tag: `appointment-${row.booking_id}`,
  });
}

/**
 * Orquesta un ciclo. Dependencias inyectadas -> comprobable sin red:
 *  db: { rpc(name,args), pushSubs(bookingId), deleteSub(id) }  ·  fetchImpl  ·  sendPush(sub,payload)
 */
export async function runReminders({ db, fetchImpl, sendPush, cfg, now = new Date() }) {
  const out = { checked: 0, whatsapp_sent: 0, push_sent: 0, failed: 0, pending_config: 0, skipped: 0 };
  const { data: due, error } = await db.rpc('reminders_due', { p_now: now.toISOString() });
  if (error) throw new Error('reminders_due: ' + error.message);
  for (const row of due ?? []) {
    out.checked++;
    if (row.whatsapp_opt_in && row.whatsapp_status !== 'sent') {
      if (!cfg.whatsappReady) {
        await db.rpc('record_reminder_status', { p_booking_id: row.booking_id, p_channel: 'whatsapp', p_status: 'pending_config', p_reason: 'Faltan credenciales de WhatsApp Cloud API.' });
        out.pending_config++;
      } else if (!toWhatsAppNumber(row.phone)) {
        await db.rpc('record_reminder_status', { p_booking_id: row.booking_id, p_channel: 'whatsapp', p_status: 'skipped', p_reason: 'Teléfono no válido.' });
        out.skipped++;
      } else {
        const { data: claimed } = await db.rpc('claim_reminder', { p_booking_id: row.booking_id, p_channel: 'whatsapp' });
        if (claimed === true) {
          try { const id = await sendWhatsApp(fetchImpl, row, cfg); await db.rpc('finish_reminder', { p_booking_id: row.booking_id, p_channel: 'whatsapp', p_ok: true, p_error: null, p_message_id: id }); out.whatsapp_sent++; }
          catch (e) { await db.rpc('finish_reminder', { p_booking_id: row.booking_id, p_channel: 'whatsapp', p_ok: false, p_error: String(e.message ?? e), p_message_id: null }); out.failed++; }
        }
      }
    }
    if (row.push_subscriptions > 0 && row.push_status !== 'sent') {
      if (!cfg.pushReady) {
        await db.rpc('record_reminder_status', { p_booking_id: row.booking_id, p_channel: 'push', p_status: 'pending_config', p_reason: 'Faltan llaves VAPID.' });
        out.pending_config++;
      } else {
        const { data: claimed } = await db.rpc('claim_reminder', { p_booking_id: row.booking_id, p_channel: 'push' });
        if (claimed === true) {
          const subs = await db.pushSubs(row.booking_id); let okAny = false, lastErr = '';
          for (const s of subs) {
            try { await sendPush(s, pushPayload(row, cfg)); okAny = true; }
            catch (e) { lastErr = String(e.message ?? e); if (e.statusCode === 404 || e.statusCode === 410) await db.deleteSub(s.id); }
          }
          await db.rpc('finish_reminder', { p_booking_id: row.booking_id, p_channel: 'push', p_ok: okAny, p_error: okAny ? null : (lastErr || 'Sin suscripciones válidas'), p_message_id: null });
          if (okAny) out.push_sent++; else out.failed++;
        }
      }
    }
  }
  await db.rpc('set_integration_status', { p_whatsapp: cfg.whatsappReady, p_push: cfg.pushReady, p_summary: out });
  return out;
}
