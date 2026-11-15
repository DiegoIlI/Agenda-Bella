import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronRight, Check, CalendarCheck } from 'lucide-react';
import { api } from '../api/index.js';
import { TopBar, WhatsAppBtn } from '../components/Brand.jsx';
import { SideMenu } from '../components/SideMenu.jsx';
import { MonthCalendar } from '../components/MonthCalendar.jsx';
import { ServiceIcon } from '../components/Icons.jsx';
import { Notice, Sheet, Field, Spinner } from '../components/ui.jsx';
import { PrivacyNotice } from './Privacy.jsx';
import { localToday, addMonths, firstOfMonth, addDays, shortDay, formatTime, durationText, toLocalDayTime, longDay } from '../lib/dates.js';
import { money, validatePhone, normalizePhone, makeWhatsApp } from '../lib/format.js';
import { rememberBooking, myBookingTokens } from '../notifications.js';
import { MessageCircle, Lock } from 'lucide-react';

const FIRST_COUNT = 4;

export function ClientBooking({ data }) {
  const { settings, services } = data;
  const today = localToday();
  const [menu, setMenu] = useState(false);
  const [serviceId, setServiceId] = useState(() => (services.find(s => /balayage/i.test(s.name)) || services[0])?.id);
  const [showAll, setShowAll] = useState(false);
  const [month, setMonth] = useState(firstOfMonth(today));
  const [avail, setAvail] = useState({}); const [availLoading, setAvailLoading] = useState(true);
  const [day, setDay] = useState(null);
  const [slots, setSlots] = useState(null); const [time, setTime] = useState(null);
  const [form, setForm] = useState(false);
  const [error, setError] = useState('');
  const [upcoming, setUpcoming] = useState(null);
  const slotsReq = useRef(0); const availReq = useRef(0);
  const service = services.find(s => s.id === serviceId);
  const waHref = makeWhatsApp(settings.whatsapp_phone, 'Hola, quiero hacer una consulta sobre una cita.');
  const maxMonth = firstOfMonth(addDays(today, settings.booking_window_days));

  const loadMonth = useCallback(async (m, sid, keepDay) => {
    const id = ++availReq.current; setAvailLoading(true);
    try {
      const rows = await api.monthAvailability(sid, m); if (id !== availReq.current) return;
      const map = Object.fromEntries(rows.map(r => [r.day, r])); setAvail(map); setError('');
      const free = rows.filter(r => r.free_slots > 0 && r.day >= today);
      setDay(cur => (keepDay && cur && map[cur]?.free_slots > 0 ? cur : free[0]?.day || null));
    } catch (e) { if (id === availReq.current) setError(e.message); } finally { if (id === availReq.current) setAvailLoading(false); }
  }, [today]);
  useEffect(() => { if (serviceId) loadMonth(month, serviceId, true); }, [month, serviceId, loadMonth]);

  const loadSlots = useCallback(async () => {
    if (!day || !serviceId) { setSlots(null); return; }
    const id = ++slotsReq.current; setSlots(null);
    try { const r = await api.daySlots(serviceId, day); if (id === slotsReq.current) { setSlots(r); setTime(t => (r.some(x => x.time_label === t && x.available) ? t : null)); } }
    catch (e) { if (id === slotsReq.current) setError(e.message); }
  }, [day, serviceId]);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  useEffect(() => { // “Tu próxima cita”
    const t = myBookingTokens()[0]; if (!t) return;
    api.booking(t).then(d => { if (d && d.status === 'confirmed' && new Date(d.end_at) > new Date()) setUpcoming({ token: t, ...d }); }).catch(() => {});
  }, []);

  const chooseService = id => { if (id === serviceId) return; setServiceId(id); setTime(null); setSlots(null); };
  const shown = showAll ? services : services.slice(0, FIRST_COUNT);

  return (
    <div className="screen client">
      <TopBar onMenu={() => setMenu(true)} right={waHref ? <WhatsAppBtn href={waHref} label="Escribir al salón por WhatsApp" /> : <span className="icon-spacer" />} />
      <SideMenu open={menu} onClose={() => setMenu(false)} items={[
        { label: 'Reservar cita', icon: <Calendar size={20} />, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
        waHref && { label: 'WhatsApp del salón', icon: <MessageCircle size={20} />, href: waHref, external: true },
        { label: 'Aviso de privacidad', icon: <Lock size={20} />, onClick: () => setForm('privacy') },
        { label: 'Acceso del salón', icon: <Lock size={20} />, href: '#/admin' },
      ].filter(Boolean)} />
      <div className="hero"><p>Tu belleza merece<br />su momento <span>♡</span></p></div>
      <main className="sheet-card">
        {upcoming && <a className="next-appt" href={`#/cita/${upcoming.token}`}><CalendarCheck size={20} /><div><b>Tu próxima cita</b><small>{upcoming.service_name} · {longDay(toLocalDayTime(upcoming.start_at).day)}, {formatTime(toLocalDayTime(upcoming.start_at).time)}</small></div><ChevronRight size={18} /></a>}
        <div className="h-row"><Calendar size={34} strokeWidth={1.4} /><div><h1>Reserva tu cita</h1><p>Selecciona el servicio, la fecha y el horario disponible.</p></div></div>
        {error && <Notice tone="error">{error}</Notice>}

        <ul className="svc-list" aria-label="Servicios">
          {shown.map(s => (
            <li key={s.id}><button className={`svc ${s.id === serviceId ? 'sel' : ''}`} onClick={() => chooseService(s.id)} aria-pressed={s.id === serviceId}>
              <span className="svc-ico"><ServiceIcon name={s.icon} /></span>
              <span className="svc-txt"><b>{s.name}</b><small>Duración: {durationText(s.duration_minutes)} · {money(s.price)}</small></span>
              {s.id === serviceId ? <span className="svc-check"><Check size={16} strokeWidth={3} /></span> : <ChevronRight size={18} className="chev" />}
            </button></li>))}
        </ul>
        {services.length > FIRST_COUNT && <button className="link" onClick={() => setShowAll(v => !v)}>{showAll ? 'Mostrar menos' : `Ver los ${services.length} servicios`}</button>}

        <MonthCalendar month={month} onMonth={d => setMonth(m => addMonths(m, d))} selected={day} onSelect={d => { setDay(d); setTime(null); }} info={avail} loading={availLoading}
          canPrev={month > firstOfMonth(today)} canNext={month < maxMonth} />
        {!availLoading && !Object.values(avail).some(a => a.free_slots > 0 && a.day >= today) && <Notice>No hay horarios libres este mes para este servicio. Prueba el mes siguiente o escríbenos por WhatsApp.</Notice>}

        {day && <>
          <h2 className="slots-title">Horarios disponibles – {shortDay(day)}</h2>
          {!slots ? <Spinner label="Buscando horarios…" /> : slots.length === 0 ? <p className="muted">No hay horarios para este día.</p> :
            <div className="slots" role="group" aria-label="Horarios">{slots.map(s => (
              <button key={s.time_label} disabled={!s.available} className={`slot ${time === s.time_label ? 'sel' : ''}`} onClick={() => setTime(s.time_label)} aria-pressed={time === s.time_label}
                aria-label={`${formatTime(s.time_label)}${s.available ? '' : ', ocupado'}`}>{formatTime(s.time_label)}</button>))}</div>}
        </>}
        <div className="cta-bar"><button className="btn primary block" disabled={!service || !day || !time} onClick={() => setForm(true)}><Calendar size={20} />Reservar cita</button></div>
      </main>
      {form === true && service && <ConfirmSheet service={service} day={day} time={time} settings={settings} onClose={() => setForm(false)} onTaken={() => { setForm(false); loadSlots(); loadMonth(month, serviceId, true); }} />}
      {form === 'privacy' && <PrivacyNotice salon={settings} onClose={() => setForm(false)} />}
    </div>
  );
}

function ConfirmSheet({ service, day, time, settings, onClose, onTaken }) {
  const [f, setF] = useState({ name: '', phone: '', wa: false, privacy: false });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [touched, setTouched] = useState(false); const [priv, setPriv] = useState(false);
  const errors = { name: f.name.trim().length < 2 ? 'Escribe tu nombre completo.' : '', phone: validatePhone(f.phone) ? '' : 'Escribe 10 dígitos (ej. 999 123 4567).', privacy: f.privacy ? '' : 'Debes aceptar para reservar.' };
  const submit = async e => {
    e.preventDefault(); setTouched(true); setErr('');
    if (errors.name || errors.phone || errors.privacy) return;
    setBusy(true);
    try {
      const token = await api.book({ service_id: service.id, day, time, client_name: f.name, phone: normalizePhone(f.phone), whatsapp_opt_in: f.wa, privacy_accepted: f.privacy });
      rememberBooking(token); window.location.hash = `#/cita/${token}`;
    } catch (e2) { setErr(e2.message); if (/horario|otra clienta/i.test(e2.message)) setTimeout(onTaken, 1800); } finally { setBusy(false); }
  };
  return (
    <Sheet title="Confirma tu reservación" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="sum"><b>{service.name}</b><span>{longDay(day)} · {formatTime(time)}</span><span>{durationText(service.duration_minutes)} · {money(service.price)} (precio de referencia)</span></div>
        <Field label="Nombre completo" error={touched && errors.name}><input autoComplete="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={70} placeholder="Ej. Ana López" /></Field>
        <Field label="Celular (WhatsApp)" error={touched && errors.phone}><input inputMode="tel" autoComplete="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} maxLength={20} placeholder="999 123 4567" /></Field>
        <label className="check"><input type="checkbox" checked={f.wa} onChange={e => setF({ ...f, wa: e.target.checked })} />
          <span>{settings.whatsapp_reminders_active ? 'Quiero recibir un recordatorio por WhatsApp el día anterior a mi cita.' : 'Quiero recibir un recordatorio por WhatsApp cuando el salón active este servicio (todavía pendiente de configuración).'} <small>Opcional. Puedes retirarlo cuando quieras.</small></span></label>
        <label className="check"><input type="checkbox" checked={f.privacy} onChange={e => setF({ ...f, privacy: e.target.checked })} />
          <span>He leído y acepto el <button type="button" className="inline" onClick={() => setPriv(true)}>aviso de privacidad</button>.</span></label>
        {touched && errors.privacy && <small className="err">{errors.privacy}</small>}
        {err && <Notice tone="error">{err}</Notice>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Reservando…' : 'Confirmar reservación'}</button>
      </form>
      {priv && <PrivacyNotice salon={settings} onClose={() => setPriv(false)} />}
    </Sheet>
  );
}
