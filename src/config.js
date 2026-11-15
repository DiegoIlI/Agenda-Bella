// Configuración pública (nunca secretos). Las variables VITE_* quedan visibles en el navegador.
const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isPlaceholder = v => !v || v.includes('TU_PROYECTO') || v.includes('TU_PUBLISHABLE');

export const supabaseUrl = url;
export const supabaseKey = key;
export const supabaseConfigured = !isPlaceholder(url) && !isPlaceholder(key);
export const demoEnabled = import.meta.env.VITE_DEMO_MODE === 'true';

// 'live'  → base de datos real (producción).
// 'demo'  → simulador local SOLO si se pidió expresamente (VITE_DEMO_MODE=true) y no hay Supabase.
// 'unconfigured' → producción sin base de datos: NO se pueden hacer reservaciones reales.
export const mode = supabaseConfigured ? 'live' : demoEnabled ? 'demo' : 'unconfigured';

export const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
export const hasVapid = !!vapidPublicKey && !vapidPublicKey.startsWith('TU_');
export const publicBookingUrl = (import.meta.env.VITE_PUBLIC_BOOKING_URL || '').trim();

export const BUSINESS_TZ = 'America/Merida';
// Mérida (Yucatán) no usa horario de verano desde 2022: UTC−6 todo el año.
// Solo se usa en el cliente para notificaciones locales y .ics; la base de datos usa la zona IANA.
export const BUSINESS_UTC_OFFSET = '-06:00';
export const DEFAULT_SALON_PHONE = '9997666778';
