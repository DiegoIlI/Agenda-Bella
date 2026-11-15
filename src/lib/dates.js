import { BUSINESS_TZ, BUSINESS_UTC_OFFSET } from '../config.js';

const pad = n => String(n).padStart(2, '0');
const ymdParts = ymd => ymd.split('-').map(Number);
const utcNoon = ymd => new Date(`${ymd}T12:00:00Z`);

export function localToday(now = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(now); // YYYY-MM-DD
}
export function localNowMinutes(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  return minutes(p);
}
export function addDays(ymd, n) { const d = utcNoon(ymd); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function addMonths(ymd, n) { const [y, m] = ymdParts(ymd); return new Date(Date.UTC(y, m - 1 + n, 1, 12)).toISOString().slice(0, 10); }
export const firstOfMonth = ymd => `${ymd.slice(0, 7)}-01`;
export function daysInMonth(ymd) { const [y, m] = ymdParts(ymd); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
export const dayOfWeek = ymd => utcNoon(ymd).getUTCDay();
export const minutes = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const clock = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const startOfWeek = ymd => addDays(ymd, -dayOfWeek(ymd)); // semana de domingo a sábado (como el diseño)

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const monthLabel = ymd => cap(utcNoon(ymd).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
export const longDay = ymd => utcNoon(ymd).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
export const shortDay = ymd => utcNoon(ymd).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' });
export const weekdayShort = ymd => cap(utcNoon(ymd).toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''));

// "10:00" → "10:00 AM" (como el diseño de referencia)
export function formatTime(t) {
  let [h, m] = t.slice(0, 5).split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${suffix}`;
}
export const hourParts = t => { const s = formatTime(t).split(' '); return { time: s[0], suffix: s[1] }; };

// Instante ISO (UTC) → día y hora de pared en Mérida.
export function toLocalDayTime(iso) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso));
  const g = x => parts.find(p => p.type === x)?.value;
  const hh = g('hour') === '24' ? '00' : g('hour');
  return { day: `${g('year')}-${g('month')}-${g('day')}`, time: `${hh}:${g('minute')}` };
}
// Día + hora de pared en Mérida → Date absoluto.
export const meridaDate = (ymd, hhmm) => new Date(`${ymd}T${hhmm}:00${BUSINESS_UTC_OFFSET}`);

export function durationText(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
