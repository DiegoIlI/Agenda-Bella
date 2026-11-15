export const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0);

// Acepta 10 dígitos, o con 52 / 521 delante (igual que la base de datos).
export function normalizePhone(input) {
  const d = String(input || '').replace(/\D/g, '');
  if (/^\d{10}$/.test(d)) return d;
  if (/^52\d{10}$/.test(d)) return d.slice(2);
  if (/^521\d{10}$/.test(d)) return d.slice(3);
  return null;
}
export const validatePhone = s => normalizePhone(s) !== null;
// 9991234567 → "+52 999 123 4567"
export function prettyPhone(p) {
  const d = normalizePhone(p);
  return d ? `+52 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : String(p || '');
}
export function makeWhatsApp(phone, text) {
  const d = normalizePhone(phone);
  if (!d) return null;
  return `https://wa.me/52${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
export const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

// Archivo .ics para agregar la cita al calendario del teléfono.
export function buildIcs({ title, start, end, description, location, uid }) {
  const f = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Agenda Bella//ES', 'BEGIN:VEVENT', `UID:${uid}@agendabella`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(description)}`, location ? `LOCATION:${esc(location)}` : '',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Tu cita en Agenda Bella es mañana', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}
