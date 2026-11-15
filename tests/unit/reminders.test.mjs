import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { toWhatsAppNumber, safeEqual, readConfig, buildTemplatePayload, formatTimeEs, runReminders } from '../../supabase/functions/appointment-reminders/lib.js';

const env = o => k => o[k];
const WA = { WA_ACCESS_TOKEN: 'tok-secreto', WA_PHONE_NUMBER_ID: '123', WA_TEMPLATE_NAME: 'recordatorio_cita' };
const row = (o = {}) => ({ booking_id: 'b1', booking_token: 't1', client_name: 'Ana López', phone: '9991234567', start_at: '2026-12-04T17:00:00Z', service_name: 'Corte', whatsapp_opt_in: true, push_subscriptions: 0, whatsapp_status: null, push_status: null, ...o });

function fakeDb(rows, claimResult = true) {
  const calls = [];
  return { calls, rpc: async (n, a) => { calls.push([n, a]); if (n === 'reminders_due') return { data: rows }; if (n === 'claim_reminder') return { data: claimResult }; return { data: null }; }, pushSubs: async () => [{ id: 's1', endpoint: 'e', p256dh: 'p', auth_key: 'a' }], deleteSub: async id => calls.push(['deleteSub', id]) };
}
const names = db => db.calls.map(c => c[0]);

test('teléfonos mexicanos a formato WhatsApp', () => {
  assert.equal(toWhatsAppNumber('999 766 6778'), '529997666778');
  assert.equal(toWhatsAppNumber('+52 999 766 6778'), '529997666778');
  assert.equal(toWhatsAppNumber('5219997666778'), '529997666778');
  assert.equal(toWhatsAppNumber('12345'), null);
  assert.equal(toWhatsAppNumber(null), null);
});
test('comparación del secreto', () => {
  assert.ok(safeEqual('abc', 'abc')); assert.ok(!safeEqual('abc', 'abd')); assert.ok(!safeEqual('abc', 'abcd')); assert.ok(!safeEqual('', '')); assert.ok(!safeEqual(null, 'x'));
});
test('la hora se muestra en horario de Mérida (UTC-6)', () => { assert.match(formatTimeEs('2026-12-04T17:00:00Z'), /11:00/); });
test('payload de plantilla: 4 variables, nombre de pila, sin token', () => {
  const p = buildTemplatePayload(row(), readConfig(env(WA)));
  assert.equal(p.to, '529991234567'); assert.equal(p.type, 'template'); assert.equal(p.template.name, 'recordatorio_cita'); assert.equal(p.template.language.code, 'es_MX');
  const v = p.template.components[0].parameters.map(x => x.text); assert.equal(v.length, 4); assert.equal(v[0], 'Ana'); assert.equal(v[1], 'Corte'); assert.match(v[3], /11:00/);
  assert.ok(!JSON.stringify(p).includes('tok-secreto'));
});
test('sin credenciales: queda pending_config y NO se simula ningún envío', async () => {
  const db = fakeDb([row()]); let fetched = false;
  const out = await runReminders({ db, cfg: readConfig(env({})), fetchImpl: async () => { fetched = true; }, sendPush: async () => {} });
  assert.equal(fetched, false); assert.equal(out.whatsapp_sent, 0); assert.equal(out.pending_config, 1);
  const rec = db.calls.find(c => c[0] === 'record_reminder_status'); assert.equal(rec[1].p_status, 'pending_config');
  const fin = db.calls.find(c => c[0] === 'set_integration_status'); assert.equal(fin[1].p_whatsapp, false);
  assert.ok(!names(db).includes('claim_reminder') && !names(db).includes('finish_reminder'));
});
test('sin consentimiento de WhatsApp no se envía nada', async () => {
  const db = fakeDb([row({ whatsapp_opt_in: false })]); let fetched = false;
  await runReminders({ db, cfg: readConfig(env(WA)), fetchImpl: async () => { fetched = true; }, sendPush: async () => {} });
  assert.equal(fetched, false); assert.ok(!names(db).includes('claim_reminder'));
});
test('teléfono inválido se omite (skipped)', async () => {
  const db = fakeDb([row({ phone: '123' })]);
  const out = await runReminders({ db, cfg: readConfig(env(WA)), fetchImpl: async () => { throw new Error('no debe llamar'); }, sendPush: async () => {} });
  assert.equal(out.skipped, 1);
});
test('si otra ejecución ya reclamó el recordatorio no se duplica', async () => {
  const db = fakeDb([row()], false); let fetched = false;
  await runReminders({ db, cfg: readConfig(env(WA)), fetchImpl: async () => { fetched = true; }, sendPush: async () => {} });
  assert.equal(fetched, false);
});
test('ya enviado no se reenvía', async () => {
  const db = fakeDb([row({ whatsapp_status: 'sent' })]); let fetched = false;
  await runReminders({ db, cfg: readConfig(env(WA)), fetchImpl: async () => { fetched = true; }, sendPush: async () => {} });
  assert.equal(fetched, false);
});
test('envío exitoso contra un servidor WhatsApp local simulado (HTTP real en localhost)', async () => {
  const seen = [];
  const srv = http.createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { seen.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b) }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ messages: [{ id: 'wamid.TEST' }] })); }); });
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const localFetch = (url, init) => fetch(url.replace('https://graph.facebook.com', `http://127.0.0.1:${port}`), init);
  const db = fakeDb([row()]);
  const out = await runReminders({ db, cfg: readConfig(env(WA)), fetchImpl: localFetch, sendPush: async () => {} });
  srv.close();
  assert.equal(out.whatsapp_sent, 1); assert.equal(seen.length, 1);
  assert.match(seen[0].url, /\/v\d+\.\d+\/123\/messages$/); assert.equal(seen[0].auth, 'Bearer tok-secreto'); assert.equal(seen[0].body.to, '529991234567');
  const fin = db.calls.find(c => c[0] === 'finish_reminder'); assert.equal(fin[1].p_ok, true); assert.equal(fin[1].p_message_id, 'wamid.TEST');
});
test('error de Meta: se registra failed y el token no aparece en el error', async () => {
  const db = fakeDb([row()]);
  const out = await runReminders({ db, cfg: readConfig(env(WA)), fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'bad token tok-secreto' }), sendPush: async () => {} });
  assert.equal(out.failed, 1); const fin = db.calls.find(c => c[0] === 'finish_reminder'); assert.equal(fin[1].p_ok, false); assert.ok(!fin[1].p_error.includes('tok-secreto'));
});
test('push: sin VAPID -> pending_config; con VAPID envía y borra suscripciones caducadas (410)', async () => {
  let db = fakeDb([row({ whatsapp_opt_in: false, push_subscriptions: 1 })]);
  let out = await runReminders({ db, cfg: readConfig(env({})), fetchImpl: async () => {}, sendPush: async () => { throw new Error('no'); } });
  assert.equal(out.pending_config, 1);
  const V = { VAPID_PUBLIC_KEY: 'a', VAPID_PRIVATE_KEY: 'b', VAPID_SUBJECT: 'mailto:x@y.mx', APP_PUBLIC_URL: 'https://x.mx/' };
  db = fakeDb([row({ whatsapp_opt_in: false, push_subscriptions: 1 })]);
  out = await runReminders({ db, cfg: readConfig(env(V)), fetchImpl: async () => {}, sendPush: async (s, p) => { assert.match(p, /#\/cita\/t1/); } });
  assert.equal(out.push_sent, 1);
  db = fakeDb([row({ whatsapp_opt_in: false, push_subscriptions: 1 })]);
  out = await runReminders({ db, cfg: readConfig(env(V)), fetchImpl: async () => {}, sendPush: async () => { const e = new Error('gone'); e.statusCode = 410; throw e; } });
  assert.equal(out.failed, 1); assert.ok(names(db).includes('deleteSub'));
});
