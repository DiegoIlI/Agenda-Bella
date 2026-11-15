import { useEffect, useState } from 'react';
import { Settings, Copy, Share2, LogOut, Trash2, BellRing, Ban } from 'lucide-react';
import { api } from '../api/index.js';
import { Field, Notice, Toggle } from '../components/ui.jsx';
import { BlockSheet } from './AgendaTab.jsx';
import { normalizePhone, prettyPhone } from '../lib/format.js';
import { publicBookingUrl } from '../config.js';
import { toLocalDayTime, shortDay, formatTime, localToday } from '../lib/dates.js';
import { isNative } from '../notifications.js';

const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']];
const t5 = v => (v ? String(v).slice(0, 5) : '');

export function SettingsTab({ salon, bookings, mode, onSaved, onLogout }) {
  const [s, setS] = useState({ ...salon }); const [hours, setHours] = useState(null); const [off, setOff] = useState([]); const [rem, setRem] = useState(null);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [block, setBlock] = useState(false); const [copied, setCopied] = useState(false);
  const loadOff = () => api.adminTimeOff().then(setOff).catch(e => setErr(e.message));
  useEffect(() => { api.adminHours().then(setHours).catch(e => setErr(e.message)); loadOff(); api.adminReminderInfo().then(setRem).catch(() => setRem(null)); }, []);
  const link = publicBookingUrl || `${location.origin}${location.pathname}`;
  const linkOk = !isNative() || !!publicBookingUrl;
  const flash = m => { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 4000); };
  const guard = async fn => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };

  const saveSalon = e => { e.preventDefault(); guard(async () => {
    const phone = normalizePhone(s.whatsapp_phone); if (!phone) throw new Error('El WhatsApp del salón debe tener 10 dígitos (sin +52).');
    if (!s.salon_name.trim()) throw new Error('Escribe el nombre del salón.');
    await api.adminSaveSettings({ ...s, whatsapp_phone: phone, salon_name: s.salon_name.trim(), booking_window_days: Number(s.booking_window_days), slot_interval_minutes: Number(s.slot_interval_minutes), min_notice_minutes: Number(s.min_notice_minutes), cancel_min_hours: Number(s.cancel_min_hours), reminder_hour: Number(s.reminder_hour) });
    await onSaved(); flash('Ajustes guardados.'); }); };
  const saveHours = () => guard(async () => {
    for (const h of hours) { if (h.is_open && t5(h.end_time) <= t5(h.start_time)) throw new Error('Revisa el horario: la hora de cierre debe ser posterior a la apertura.'); if ((h.break_start || h.break_end) && !(h.break_start && h.break_end && t5(h.break_end) > t5(h.break_start))) throw new Error('Revisa el descanso: indica inicio y fin válidos o déjalo vacío.'); }
    await api.adminSaveHours(hours.map(h => ({ ...h, start_time: t5(h.start_time), end_time: t5(h.end_time), break_start: t5(h.break_start) || null, break_end: t5(h.break_end) || null }))); await onSaved(); flash('Horarios guardados.'); });
  const setH = (wd, k, v) => setHours(hs => hs.map(h => (h.weekday === wd ? { ...h, [k]: v } : h)));
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copia el enlace:', link); } };
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Reserva tu cita en ${salon.salon_name}: ${link}`)}`, '_blank', 'noopener');
  const nameOf = id => bookings.find(b => b.id === id)?.client_name || 'Cita';

  return (
    <section className="tab">
      <div className="h-row admin"><span className="h-box"><Settings size={28} strokeWidth={1.5} /></span><div><h1>Ajustes</h1><p>Configuración general del salón.</p></div></div>
      {err && <Notice tone="error">{err}</Notice>}{msg && <Notice tone="ok">{msg}</Notice>}
      {mode === 'demo' && <Notice tone="warn">Modo demostración: los cambios se guardan solo en este navegador.</Notice>}

      <div className="card"><h3>Enlace para tus clientas</h3>
        {linkOk ? <><input readOnly value={link} onFocus={e => e.target.select()} aria-label="Enlace de reservaciones" /><div className="row"><button className="btn ghost" onClick={copy}><Copy size={17} />{copied ? '¡Copiado!' : 'Copiar'}</button><button className="btn primary" onClick={share}><Share2 size={17} />Compartir</button></div></>
          : <Notice tone="warn">Para compartir el enlace desde la app instalada, configura VITE_PUBLIC_BOOKING_URL con la dirección pública de tu sitio.</Notice>}</div>

      <form className="card" onSubmit={saveSalon}><h3>Datos del salón</h3>
        <Field label="Nombre"><input value={s.salon_name} maxLength={60} onChange={e => setS({ ...s, salon_name: e.target.value })} /></Field>
        <Field label="Frase de bienvenida"><input value={s.tagline || ''} maxLength={90} onChange={e => setS({ ...s, tagline: e.target.value })} /></Field>
        <Field label="WhatsApp del salón (10 dígitos, México +52)" hint={`Se abrirá https://wa.me/52${normalizePhone(s.whatsapp_phone) || '…'} · ${normalizePhone(s.whatsapp_phone) ? prettyPhone(s.whatsapp_phone) : ''}`}><input inputMode="tel" value={s.whatsapp_phone} onChange={e => setS({ ...s, whatsapp_phone: e.target.value })} /></Field>
        <Field label="Instagram (opcional)"><input value={s.instagram || ''} maxLength={60} onChange={e => setS({ ...s, instagram: e.target.value })} placeholder="@tusalon" /></Field>
        <Field label="Dirección (opcional)"><input value={s.address || ''} maxLength={160} onChange={e => setS({ ...s, address: e.target.value })} /></Field>
        <h3 className="sub">Reglas de reservación</h3>
        <div className="two">
          <Field label="Reservar hasta con"><select value={s.booking_window_days} onChange={e => setS({ ...s, booking_window_days: e.target.value })}>{[14, 30, 60, 90, 120, 180].map(n => <option key={n} value={n}>{n} días</option>)}</select></Field>
          <Field label="Horarios cada"><select value={s.slot_interval_minutes} onChange={e => setS({ ...s, slot_interval_minutes: e.target.value })}>{[15, 20, 30, 45, 60].map(n => <option key={n} value={n}>{n} min</option>)}</select></Field>
          <Field label="Anticipación mínima"><select value={s.min_notice_minutes} onChange={e => setS({ ...s, min_notice_minutes: e.target.value })}>{[[0, 'Sin mínimo'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [720, '12 horas'], [1440, '1 día']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Cancelar hasta"><select value={s.cancel_min_hours} onChange={e => setS({ ...s, cancel_min_hours: e.target.value })}>{[0, 1, 2, 3, 6, 12, 24, 48].map(n => <option key={n} value={n}>{n ? `${n} h antes` : 'Cualquier momento'}</option>)}</select></Field>
          <Field label="Hora del recordatorio"><select value={s.reminder_hour} onChange={e => setS({ ...s, reminder_hour: e.target.value })}>{Array.from({ length: 14 }, (_, i) => i + 7).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></Field>
        </div>
        <button className="btn primary block" disabled={busy}>Guardar ajustes</button></form>

      <div className="card"><h3>Horarios de atención</h3><p className="muted">Descanso: opcional (por ejemplo, la comida). Los servicios no se pueden agendar encima del descanso.</p>
        {!hours ? <p className="muted">Cargando…</p> : DAYS.map(([wd, label]) => { const h = hours.find(x => x.weekday === wd); if (!h) return null; return (
          <div key={wd} className="hours-row"><div className="hours-top"><b>{label}</b><Toggle checked={h.is_open} onChange={v => setH(wd, 'is_open', v)} label={`${label} abierto`} /></div>
            {h.is_open ? <div className="hours-grid"><label>Abre<input type="time" value={t5(h.start_time)} onChange={e => setH(wd, 'start_time', e.target.value)} /></label><label>Cierra<input type="time" value={t5(h.end_time)} onChange={e => setH(wd, 'end_time', e.target.value)} /></label>
              <label>Descanso de<input type="time" value={t5(h.break_start)} onChange={e => setH(wd, 'break_start', e.target.value)} /></label><label>a<input type="time" value={t5(h.break_end)} onChange={e => setH(wd, 'break_end', e.target.value)} /></label></div> : <small className="muted">Día de descanso</small>}</div>); })}
        <button className="btn primary block" disabled={busy || !hours} onClick={saveHours}>Guardar horarios</button></div>

      <div className="card"><h3>Fechas bloqueadas</h3><p className="muted">Vacaciones, feriados o ausencias. Nadie podrá reservar en esos periodos.</p>
        {off.length === 0 ? <p className="muted">No hay bloqueos próximos.</p> : <ul className="blocks">{off.map(t => { const a = toLocalDayTime(t.start_at); const z = toLocalDayTime(new Date(new Date(t.end_at).getTime() - 1).toISOString()); const whole = a.time === '00:00' && z.time === '23:59';
          return <li key={t.id}><span><b>{whole ? (a.day === z.day ? shortDay(a.day) : `${shortDay(a.day)} → ${shortDay(z.day)}`) : `${shortDay(a.day)} · ${formatTime(a.time)}–${formatTime(toLocalDayTime(t.end_at).time)}`}</b>{t.reason && <small>{t.reason}</small>}</span>
            <button className="icon-btn ghost" aria-label="Quitar bloqueo" onClick={() => guard(async () => { await api.adminUnblock(t.id); await loadOff(); await onSaved(); })}><Trash2 size={18} /></button></li>; })}</ul>}
        <button className="btn ghost block" onClick={() => setBlock(true)}><Ban size={17} />Bloquear fechas u horas</button></div>
      {block && <BlockSheet day={localToday()} onClose={() => setBlock(false)} onDone={async () => { await loadOff(); await onSaved(); }} />}

      <div className="card"><h3><BellRing size={18} />Recordatorios por WhatsApp</h3>
        {mode === 'demo' ? <Notice tone="warn">En modo demostración no se envía ningún mensaje.</Notice> :
          rem?.status?.whatsapp_configured ? <Notice tone="ok">WhatsApp automático: <b>activo</b>. Última ejecución: {rem.status.last_run_at ? new Date(rem.status.last_run_at).toLocaleString('es-MX') : '—'}.</Notice>
            : <Notice tone="warn"><b>WhatsApp automático pendiente de configuración.</b> {rem?.status?.last_run_at ? 'El programador ya corre, pero faltan credenciales de Meta.' : 'Todavía no se ha ejecutado el programador de recordatorios.'} Las citas con permiso de la clienta quedarán marcadas como “pendiente” hasta que se configure; no se finge ningún envío.</Notice>}
        {rem?.log?.length > 0 && <ul className="rem-log">{rem.log.slice(0, 12).map(r => <li key={`${r.booking_id}${r.channel}`}><span>{nameOf(r.booking_id)} · {r.channel === 'whatsapp' ? 'WhatsApp' : 'Push'}</span><em className={r.status}>{{ sent: 'Enviado', failed: 'Falló', pending_config: 'Pendiente de configuración', skipped: 'Omitido', processing: 'En proceso' }[r.status] || r.status}</em>{r.last_error && <small>{r.last_error}</small>}</li>)}</ul>}</div>

      <button className="btn ghost block" onClick={onLogout}><LogOut size={18} />Cerrar sesión</button>
      <p className="muted center">Agenda Bella · v3 · {mode === 'live' ? 'Conectada a Supabase' : 'Modo demostración'}</p>
    </section>
  );
}
