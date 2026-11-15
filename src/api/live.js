// Capa de datos REAL (Supabase). Toda la disponibilidad y las validaciones viven en PostgreSQL;
// aquí solo se llaman funciones RPC y consultas protegidas por RLS. No hay secretos en este archivo.
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../config.js';
import { meridaDate, addDays } from '../lib/dates.js';

let client = null;
export function getDb() {
  if (!client) client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}

export function friendlyError(error) {
  const msg = String(error?.message || error || '');
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return new Error('Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  if (/jwt expired/i.test(msg)) return new Error('Tu sesión venció. Vuelve a iniciar sesión.');
  if (/permission denied|row-level security|No autorizado/i.test(msg)) return new Error('No tienes permiso para hacer esto.');
  const e = new Error(msg || 'Ocurrió un error inesperado.');
  e.code = error?.code;
  return e;
}
const ok = ({ data, error }) => { if (error) throw friendlyError(error); return data; };
const iso = (day, t = '00:00') => meridaDate(day, t).toISOString();

export const SETTINGS_COLUMNS = ['salon_name', 'tagline', 'whatsapp_phone', 'instagram', 'address', 'booking_window_days', 'slot_interval_minutes', 'min_notice_minutes', 'cancel_min_hours', 'reminder_hour', 'max_active_per_phone'];

export const liveApi = {
  mode: 'live',
  // ---- Público ----
  async getPublic() {
    const db = getDb();
    const [cfg, services, hours] = await Promise.all([
      db.from('salon_settings').select('*').eq('id', 1).single(),
      db.from('services').select('*').eq('active', true).order('sort_order'),
      db.from('working_hours').select('*').order('weekday'),
    ]);
    return { settings: ok(cfg), services: ok(services), hours: ok(hours) };
  },
  async monthAvailability(serviceId, month) {
    return ok(await getDb().rpc('monthly_availability', { p_service_id: serviceId, p_month: month }));
  },
  async daySlots(serviceId, day) {
    return ok(await getDb().rpc('day_slots', { p_service_id: serviceId, p_day: day }));
  },
  async book(f) {
    const data = ok(await getDb().rpc('book_appointment', {
      p_service_id: f.service_id, p_day: f.day, p_time: f.time, p_name: f.client_name, p_phone: f.phone,
      p_whatsapp_opt_in: !!f.whatsapp_opt_in, p_privacy_accepted: !!f.privacy_accepted,
    }));
    const token = data?.[0]?.token;
    if (!token) throw new Error('No se pudo registrar la cita. Inténtalo de nuevo.');
    return token;
  },
  async booking(token) { return ok(await getDb().rpc('appointment_detail', { p_token: token }))?.[0] || null; },
  async cancel(token) { if (!ok(await getDb().rpc('cancel_appointment', { p_token: token }))) throw new Error('No encontramos esa cita.'); },
  async revokeWhatsApp(token) { if (!ok(await getDb().rpc('revoke_whatsapp', { p_token: token }))) throw new Error('No fue posible cambiar el permiso de WhatsApp.'); },
  async subscribe(token, subscription) {
    const v = subscription.toJSON();
    ok(await getDb().rpc('register_push', { p_token: token, p_endpoint: v.endpoint, p_p256dh: v.keys.p256dh, p_auth: v.keys.auth }));
  },

  // ---- Sesión de la dueña (Supabase Auth) ----
  async getSessionUser() { const { data } = await getDb().auth.getSession(); return data?.session?.user || null; },
  async signIn(email, password) {
    const { data, error } = await getDb().auth.signInWithPassword({ email, password });
    if (error) throw new Error(/invalid login/i.test(error.message) ? 'Correo o contraseña incorrectos.' : friendlyError(error).message);
    return data.user;
  },
  async signOut() { await getDb().auth.signOut(); },
  async isStaff(userId) {
    const r = await getDb().from('staff_users').select('user_id').eq('user_id', userId).maybeSingle();
    return !!ok(r);
  },

  // ---- Panel de la dueña (RLS: solo staff_users) ----
  async adminBookings({ from, to } = {}) {
    const db = getDb();
    let q = db.from('bookings').select('*').order('start_at', { ascending: false }).limit(3000);
    if (from) q = q.gte('start_at', iso(from));
    if (to) q = q.lt('start_at', iso(addDays(to, 1)));
    const [rows, services] = await Promise.all([q, db.from('services').select('id,name,duration_minutes,price,icon,emoji,category')]);
    const map = new Map(ok(services).map(s => [s.id, s]));
    return ok(rows).reverse().map(b => ({ ...b, service: map.get(b.service_id) || null }));
  },
  async adminCreateBooking(f) {
    const d = ok(await getDb().rpc('admin_create_booking', { p_service_id: f.service_id, p_day: f.day, p_time: f.time, p_name: f.client_name, p_phone: f.phone, p_notes: f.notes || '', p_ignore_time_off: !!f.ignore_time_off }));
    return d?.[0];
  },
  async adminReschedule(id, day, time, ignoreTimeOff = false) {
    ok(await getDb().rpc('admin_reschedule_booking', { p_booking_id: id, p_day: day, p_time: time, p_ignore_time_off: ignoreTimeOff }));
  },
  async adminCancel(id, reason = '') { ok(await getDb().rpc('admin_cancel_booking', { p_booking_id: id, p_reason: reason })); },
  async adminSaveNotes(id, notes) { ok(await getDb().from('bookings').update({ notes: String(notes || '').slice(0, 500) }).eq('id', id)); },
  async adminServices() { return ok(await getDb().from('services').select('*').order('sort_order').order('name')); },
  async adminSaveService(x) {
    const row = { name: x.name.trim(), category: x.category.trim() || 'Servicios', description: (x.description || '').trim(), icon: x.icon || null, emoji: x.emoji || '✦',
      price: Number(x.price), duration_minutes: Number(x.duration_minutes), active: !!x.active, sort_order: Number(x.sort_order ?? 99) };
    if (x.id) ok(await getDb().from('services').update(row).eq('id', x.id));
    else ok(await getDb().from('services').insert(row));
  },
  async adminHours() { return ok(await getDb().from('working_hours').select('*').order('weekday')); },
  async adminSaveHours(rows) {
    for (const h of rows) {
      ok(await getDb().from('working_hours').update({ is_open: h.is_open, start_time: h.start_time, end_time: h.end_time, break_start: h.break_start || null, break_end: h.break_end || null }).eq('weekday', h.weekday));
    }
  },
  async adminSaveSettings(x) {
    const row = {}; for (const k of SETTINGS_COLUMNS) if (x[k] !== undefined) row[k] = x[k];
    ok(await getDb().from('salon_settings').update(row).eq('id', 1));
  },
  async adminTimeOff() { return ok(await getDb().from('time_off').select('*').gte('end_at', new Date().toISOString()).order('start_at')); },
  async adminBlock({ startDay, endDay, startTime = null, endTime = null, reason = '' }) {
    const d = ok(await getDb().rpc('admin_block_time', { p_start_day: startDay, p_end_day: endDay || startDay, p_start_time: startTime, p_end_time: endTime, p_reason: reason }));
    return d?.[0] || { affected_bookings: 0 };
  },
  async adminUnblock(id) { ok(await getDb().from('time_off').delete().eq('id', id)); },
  async adminReminderInfo() {
    const db = getDb();
    const [st, log] = await Promise.all([db.from('integration_status').select('*').eq('id', 1).maybeSingle(), db.from('reminder_attempts').select('*').order('updated_at', { ascending: false }).limit(40)]);
    return { status: ok(st), log: ok(log) };
  },
  // Cambios en citas en tiempo real (RLS filtra: solo staff recibe datos). Devuelve función para cancelar.
  onBookingsChanged(cb) {
    const db = getDb();
    const ch = db.channel('agenda-bella-bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => cb()).subscribe();
    return () => db.removeChannel(ch);
  },
};
