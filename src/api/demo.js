// SIMULADOR LOCAL (solo pruebas). Se activa únicamente con VITE_DEMO_MODE=true y SIN Supabase configurado.
// Guarda todo en localStorage de ESTE navegador: no se sincroniza entre teléfonos y no envía mensajes.
import { localToday, addDays, dayOfWeek, minutes, clock, meridaDate, localNowMinutes } from '../lib/dates.js';
import { normalizePhone } from '../lib/format.js';
import { DEFAULT_SALON_PHONE } from '../config.js';

const KEY = 'agenda-bella-demo-v3';
const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const wait = (ms = 120) => new Promise(r => setTimeout(r, ms));

const SETTINGS = { salon_name: 'Agenda Bella', tagline: 'Tu belleza, nuestro arte', whatsapp_phone: DEFAULT_SALON_PHONE, instagram: '', address: '', booking_window_days: 60,
  slot_interval_minutes: 30, min_notice_minutes: 60, cancel_min_hours: 3, reminder_hour: 9, max_active_per_phone: 3, whatsapp_reminders_active: false };
const SERVICES = [
  ['Corte de cabello', 'Cabello', 'scissors', 180, 45, 'Un cambio que se siente increíble.'], ['Tinte completo', 'Cabello', 'brush', 650, 120, 'Color, brillo y personalidad.'],
  ['Mechas / Balayage', 'Cabello', 'hairwave', 1200, 180, 'Luz y dimensión para tu cabello.'], ['Peinado profesional', 'Cabello', 'flower', 280, 60, 'Luce espectacular en tu ocasión.'],
  ['Manicura', 'Uñas', 'polish', 180, 45, 'Manos lindas, cuidado completo.'], ['Uñas acrílicas', 'Uñas', 'sparkles', 450, 120, 'Diseños que hablan de ti.'],
  ['Pedicura', 'Bienestar', 'droplets', 250, 60, 'Un momento de cuidado para ti.'], ['Tratamiento capilar', 'Cabello', 'droplets', 400, 90, 'Nutrición y suavidad profunda.'],
].map(([name, category, icon, price, duration_minutes, description], i) => ({ id: `demo-${i + 1}`, name, category, icon, price, duration_minutes, description, emoji: '✦', active: true, sort_order: i + 1 }));
const HOURS = [[0, '09:00', '17:00', false], [1, '09:00', '19:00', true], [2, '09:00', '19:00', true], [3, '09:00', '19:00', true], [4, '09:00', '19:00', true], [5, '09:00', '19:00', true], [6, '09:00', '16:00', true]]
  .map(([weekday, start_time, end_time, is_open]) => ({ weekday, start_time, end_time, is_open, break_start: null, break_end: null }));

function mkBooking(service, day, time, name, phone, extra = {}) {
  const start = meridaDate(day, time);
  return { id: uid(), booking_token: uid(), service_id: service.id, client_name: name, phone, start_at: start.toISOString(), end_at: new Date(start.getTime() + service.duration_minutes * 60000).toISOString(),
    status: 'confirmed', whatsapp_opt_in: false, price_at_booking: service.price, notes: '', created_by: 'client', created_at: new Date().toISOString(), ...extra };
}
function seed() {
  const today = localToday();
  let d1 = addDays(today, 1); while (dayOfWeek(d1) === 0) d1 = addDays(d1, 1);
  const d2 = dayOfWeek(addDays(d1, 1)) === 0 ? addDays(d1, 2) : addDays(d1, 1);
  const s = n => SERVICES.find(x => x.name === n);
  return { settings: { ...SETTINGS }, services: SERVICES.map(x => ({ ...x })), hours: HOURS.map(x => ({ ...x })), time_off: [], reminders: [],
    bookings: [mkBooking(s('Mechas / Balayage'), d1, '10:00', 'Ana López', '9991234567', { whatsapp_opt_in: true }), mkBooking(s('Manicura'), d1, '14:00', 'Laura Pérez', '9999876543'),
      mkBooking(s('Corte de cabello'), d2, '11:00', 'María González', '9995550101'), mkBooking(s('Tinte completo'), d2, '15:00', 'Sofía Ramírez', '9995550102')] };
}
let cache = null;
function state() {
  if (cache) return cache;
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.services?.length) return (cache = s); } catch { /* sin datos */ }
  cache = seed(); persist(); return cache;
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* modo privado */ } window.dispatchEvent(new CustomEvent('demo-changed')); }
export function resetDemo() { cache = null; try { localStorage.removeItem(KEY); } catch { /* */ } }

const overlap = (aS, aE, bS, bE) => aS < bE && bS < aE;
function computeSlots(s, serviceId, day) {
  const svc = s.services.find(x => x.id === serviceId && x.active); if (!svc) return [];
  const today = localToday(); if (day < today || day > addDays(today, s.settings.booking_window_days)) return [];
  const h = s.hours.find(x => x.weekday === dayOfWeek(day)); if (!h?.is_open) return [];
  const out = []; const end = minutes(h.end_time); const step = s.settings.slot_interval_minutes;
  for (let m = minutes(h.start_time); m + svc.duration_minutes <= end; m += step) {
    if (h.break_start && m < minutes(h.break_end) && m + svc.duration_minutes > minutes(h.break_start)) continue;
    const start = meridaDate(day, clock(m)); const stop = new Date(start.getTime() + svc.duration_minutes * 60000);
    const free = start.getTime() >= Date.now() + s.settings.min_notice_minutes * 60000
      && !s.bookings.some(b => b.status === 'confirmed' && overlap(start, stop, new Date(b.start_at), new Date(b.end_at)))
      && !s.time_off.some(t => overlap(start, stop, new Date(t.start_at), new Date(t.end_at)));
    out.push({ time_label: clock(m), available: free });
  }
  return out;
}
const withService = (s, b) => ({ ...b, service: s.services.find(x => x.id === b.service_id) || null });

export const demoApi = {
  mode: 'demo',
  async getPublic() { await wait(); const s = state(); return { settings: s.settings, services: s.services.filter(x => x.active).sort((a, b) => a.sort_order - b.sort_order), hours: s.hours }; },
  async monthAvailability(serviceId, month) {
    await wait(60); const s = state(); const first = month.slice(0, 7) + '-01'; const n = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
    return Array.from({ length: n }, (_, i) => { const day = `${first.slice(0, 7)}-${String(i + 1).padStart(2, '0')}`; const sl = computeSlots(s, serviceId, day); return { day, free_slots: sl.filter(x => x.available).length, total_slots: sl.length }; });
  },
  async daySlots(serviceId, day) { await wait(60); return computeSlots(state(), serviceId, day); },
  async book(f) {
    await wait(); const s = state(); const svc = s.services.find(x => x.id === f.service_id && x.active); const phone = normalizePhone(f.phone);
    const name = String(f.client_name || '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 70) throw new Error('Escribe tu nombre completo (entre 2 y 70 letras).');
    if (!phone) throw new Error('Escribe un número celular mexicano de 10 dígitos.');
    if (!f.privacy_accepted) throw new Error('Debes aceptar el aviso de privacidad para reservar.');
    if (!svc) throw new Error('Ese servicio ya no está disponible.');
    if (!computeSlots(s, svc.id, f.day).some(x => x.time_label === f.time && x.available)) throw new Error('Ese horario ya no está disponible. Elige otro.');
    if (s.bookings.filter(b => b.phone === phone && b.status === 'confirmed' && new Date(b.end_at) > new Date()).length >= s.settings.max_active_per_phone) throw new Error(`Ya tienes ${s.settings.max_active_per_phone} citas próximas con este número. Escríbenos por WhatsApp para cambios.`);
    const b = mkBooking(svc, f.day, f.time, name, phone, { whatsapp_opt_in: !!f.whatsapp_opt_in });
    s.bookings.push(b); persist(); return b.booking_token;
  },
  async booking(token) {
    await wait(); const s = state(); const b = s.bookings.find(x => x.booking_token === token); if (!b) return null;
    const svc = s.services.find(x => x.id === b.service_id);
    return { client_name: b.client_name, service_name: svc?.name, start_at: b.start_at, end_at: b.end_at, duration_minutes: Math.round((new Date(b.end_at) - new Date(b.start_at)) / 60000), price: b.price_at_booking ?? svc?.price,
      status: b.status, whatsapp_opt_in: b.whatsapp_opt_in, can_cancel: b.status === 'confirmed' && new Date(b.start_at) - Date.now() >= s.settings.cancel_min_hours * 3600000, cancel_min_hours: s.settings.cancel_min_hours };
  },
  async cancel(token) {
    await wait(); const s = state(); const b = s.bookings.find(x => x.booking_token === token); if (!b) throw new Error('No encontramos esa cita.');
    if (b.status !== 'confirmed') throw new Error('Esta cita ya estaba cancelada.'); if (new Date(b.start_at) <= new Date()) throw new Error('Esta cita ya pasó.');
    if (new Date(b.start_at) - Date.now() < s.settings.cancel_min_hours * 3600000) throw new Error(`Para cancelar con menos de ${s.settings.cancel_min_hours} horas de anticipación, escribe al salón por WhatsApp.`);
    b.status = 'cancelled'; b.cancelled_by = 'client'; persist();
  },
  async revokeWhatsApp(token) { const s = state(); const b = s.bookings.find(x => x.booking_token === token); if (!b) throw new Error('No encontramos esa cita.'); b.whatsapp_opt_in = false; persist(); },
  async subscribe() { /* el simulador no registra notificaciones push */ },

  async getSessionUser() { return { id: 'demo', email: 'demo@local' }; },
  async signIn() { return { id: 'demo', email: 'demo@local' }; },
  async signOut() {},
  async isStaff() { return true; },

  async adminBookings({ from, to } = {}) {
    await wait(60); const s = state(); const a = from ? meridaDate(from, '00:00') : null; const z = to ? meridaDate(addDays(to, 1), '00:00') : null;
    return s.bookings.filter(b => (!a || new Date(b.start_at) >= a) && (!z || new Date(b.start_at) < z)).sort((x, y) => x.start_at.localeCompare(y.start_at)).map(b => withService(s, b));
  },
  async adminCreateBooking(f) {
    const s = state(); const svc = s.services.find(x => x.id === f.service_id); const phone = normalizePhone(f.phone);
    if (!svc) throw new Error('Servicio no encontrado.'); if (!phone) throw new Error('El teléfono debe tener 10 dígitos.'); if ((f.client_name || '').trim().length < 2) throw new Error('Escribe el nombre de la clienta.');
    const b = mkBooking(svc, f.day, f.time, f.client_name.trim(), phone, { created_by: 'admin', notes: f.notes || '' });
    if (s.bookings.some(x => x.status === 'confirmed' && overlap(new Date(b.start_at), new Date(b.end_at), new Date(x.start_at), new Date(x.end_at)))) throw new Error('Ya hay otra cita en ese horario.');
    if (!f.ignore_time_off && s.time_off.some(t => overlap(new Date(b.start_at), new Date(b.end_at), new Date(t.start_at), new Date(t.end_at)))) throw new Error('Ese horario está bloqueado. Quita el bloqueo o confirma que quieres reservar de todos modos.');
    s.bookings.push(b); persist(); return { booking_id: b.id, token: b.booking_token };
  },
  async adminReschedule(id, day, time, ignore = false) {
    const s = state(); const b = s.bookings.find(x => x.id === id); if (!b || b.status !== 'confirmed') throw new Error('Solo se pueden mover citas confirmadas.');
    const len = new Date(b.end_at) - new Date(b.start_at); const start = meridaDate(day, time); const end = new Date(start.getTime() + len);
    if (s.bookings.some(x => x.id !== id && x.status === 'confirmed' && overlap(start, end, new Date(x.start_at), new Date(x.end_at)))) throw new Error('Ya hay otra cita en ese horario.');
    if (!ignore && s.time_off.some(t => overlap(start, end, new Date(t.start_at), new Date(t.end_at)))) throw new Error('Ese horario está bloqueado.');
    b.start_at = start.toISOString(); b.end_at = end.toISOString(); persist();
  },
  async adminCancel(id, reason = '') { const s = state(); const b = s.bookings.find(x => x.id === id); if (b && b.status === 'confirmed') { b.status = 'cancelled'; b.cancelled_by = 'admin'; b.cancel_reason = reason; } persist(); },
  async adminSaveNotes(id, notes) { const s = state(); const b = s.bookings.find(x => x.id === id); if (b) b.notes = notes; persist(); },
  async adminServices() { return [...state().services].sort((a, b) => a.sort_order - b.sort_order); },
  async adminSaveService(x) {
    const s = state(); const row = { name: x.name.trim(), category: x.category.trim() || 'Servicios', description: x.description || '', icon: x.icon || null, emoji: '✦', price: Number(x.price), duration_minutes: Number(x.duration_minutes), active: !!x.active };
    if (x.id) s.services = s.services.map(v => (v.id === x.id ? { ...v, ...row } : v)); else s.services.push({ id: uid(), sort_order: s.services.length + 1, ...row }); persist();
  },
  async adminHours() { return state().hours; },
  async adminSaveHours(rows) { const s = state(); s.hours = rows.map(r => ({ ...r })); persist(); },
  async adminSaveSettings(x) { const s = state(); s.settings = { ...s.settings, ...x }; persist(); },
  async adminTimeOff() { return state().time_off.filter(t => new Date(t.end_at) >= new Date()).sort((a, b) => a.start_at.localeCompare(b.start_at)); },
  async adminBlock({ startDay, endDay, startTime = null, endTime = null, reason = '' }) {
    const s = state(); const start = meridaDate(startDay, startTime || '00:00'); const end = startTime ? meridaDate(startDay, endTime) : meridaDate(addDays(endDay || startDay, 1), '00:00');
    if (end <= start) throw new Error('Revisa las fechas y horas del bloqueo.');
    s.time_off.push({ id: uid(), start_at: start.toISOString(), end_at: end.toISOString(), reason });
    const affected = s.bookings.filter(b => b.status === 'confirmed' && overlap(start, end, new Date(b.start_at), new Date(b.end_at))).length; persist(); return { affected_bookings: affected };
  },
  async adminUnblock(id) { const s = state(); s.time_off = s.time_off.filter(t => t.id !== id); persist(); },
  async adminReminderInfo() { return { status: { whatsapp_configured: false, push_configured: false, last_run_at: null }, log: [] }; },
  onBookingsChanged(cb) { window.addEventListener('demo-changed', cb); return () => window.removeEventListener('demo-changed', cb); },
};
export const _demoInternals = { computeSlots, state, localNowMinutes };
