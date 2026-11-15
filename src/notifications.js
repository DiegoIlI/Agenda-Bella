// Avisos de cita en el teléfono de la clienta. Qué es posible depende de dónde corre la app:
//  • App nativa (IPA/Capacitor, también con SideStore): NOTIFICACIONES LOCALES programadas en el propio iPhone.
//    No requieren APNs ni cuenta de pago de Apple. Se sincronizan cuando la app se abre.
//  • PWA instalada en pantalla de inicio (iOS 16.4+/Android): Web Push con VAPID (necesita claves y la Edge Function).
//  • Safari/Chrome sin instalar: sin avisos; se ofrece el recordatorio por WhatsApp y el archivo de calendario.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { hasVapid, vapidPublicKey } from './config.js';
import { meridaDate, addDays, toLocalDayTime, longDay, formatTime } from './lib/dates.js';

const LocalNotifications = registerPlugin('LocalNotifications');
const MY_KEY = 'ab_my_bookings';
const NOTIF_KEY = 'ab_local_notifs';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento no disponible */ } };

export const isNative = () => Capacitor.isNativePlatform();
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function rememberBooking(token) { const l = read(MY_KEY, []).filter(t => t !== token); l.unshift(token); write(MY_KEY, l.slice(0, 20)); }
export const myBookingTokens = () => read(MY_KEY, []);

export function capability() {
  if (isNative()) return { kind: 'native', ok: true, text: 'Recibirás un aviso en este teléfono el día anterior y 2 horas antes.' };
  const hasPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!hasPush) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return { kind: 'unsupported', ok: false, text: ios ? 'En iPhone, agrega esta página a tu pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí para activar avisos.' : 'Este navegador no permite avisos. Instala la app o usa el recordatorio por WhatsApp.' };
  }
  if (!hasVapid) return { kind: 'novapid', ok: false, text: 'Los avisos push aún no están configurados por el salón.' };
  return { kind: 'webpush', ok: true, text: 'Recibirás un aviso push de tu cita en este dispositivo.' };
}

const idFor = (token, n) => (parseInt(token.replace(/-/g, '').slice(0, 7), 16) % 2000000) * 10 + n;

// Calcula cuándo avisar: día anterior a la hora configurada y 2 h antes. Solo instantes futuros.
export function reminderTimes(startIso, reminderHour = 9) {
  const { day } = toLocalDayTime(startIso); const start = new Date(startIso);
  const hh = `${String(reminderHour).padStart(2, '0')}:00`;
  return [meridaDate(addDays(day, -1), hh), new Date(start.getTime() - 2 * 3600000)].filter(d => d.getTime() > Date.now() + 60000);
}

async function scheduleNative(token, detail, reminderHour) {
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') throw new Error('No autorizaste las notificaciones. Puedes activarlas en Ajustes del iPhone → Agenda Bella.');
  await cancelLocal(token);
  const { day, time } = toLocalDayTime(detail.start_at);
  const when = `${longDay(day)} a las ${formatTime(time)}`;
  const times = reminderTimes(detail.start_at, reminderHour);
  if (!times.length) throw new Error('La cita es muy pronto para programar un aviso.');
  const notifications = times.map((at, i) => ({ id: idFor(token, i), title: 'Agenda Bella · Recordatorio', body: `${detail.service_name}: ${when}.`, schedule: { at, allowWhileIdle: true } }));
  await LocalNotifications.schedule({ notifications });
  const all = read(NOTIF_KEY, {}); all[token] = { ids: notifications.map(n => n.id), start_at: detail.start_at }; write(NOTIF_KEY, all);
}
export async function cancelLocal(token) {
  if (!isNative()) return;
  const all = read(NOTIF_KEY, {}); const rec = all[token]; if (!rec) return;
  try { await LocalNotifications.cancel({ notifications: rec.ids.map(id => ({ id })) }); } catch { /* ya no existen */ }
  delete all[token]; write(NOTIF_KEY, all);
}

const b64 = s => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
async function subscribeWebPush(api, token) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('No se autorizaron los avisos en este navegador.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapidPublicKey) });
  await api.subscribe(token, sub);
}

export async function enableReminders(api, token, detail, reminderHour) {
  const cap = capability();
  if (!cap.ok) throw new Error(cap.text);
  if (cap.kind === 'native') return scheduleNative(token, detail, reminderHour);
  return subscribeWebPush(api, token);
}

// Al abrir la app: si una cita se canceló o cambió de hora, se corrigen los avisos locales.
export async function reconcileLocal(api, reminderHour) {
  if (!isNative()) return;
  const all = read(NOTIF_KEY, {});
  for (const token of Object.keys(all)) {
    try {
      const d = await api.booking(token);
      if (!d || d.status !== 'confirmed' || new Date(d.end_at) < new Date()) await cancelLocal(token);
      else if (d.start_at !== all[token].start_at) await scheduleNative(token, d, reminderHour);
    } catch { /* sin conexión: se conservan los avisos actuales */ }
  }
}
