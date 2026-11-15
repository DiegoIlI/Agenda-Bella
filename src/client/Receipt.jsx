import { useEffect, useState } from 'react';
import { CheckCircle2, CalendarPlus, Bell, XCircle, MessageCircle, ArrowLeft, Clock3 } from 'lucide-react';
import { api } from '../api/index.js';
import { Notice, Spinner, Sheet } from '../components/ui.jsx';
import { TopBar } from '../components/Brand.jsx';
import { SideMenu } from '../components/SideMenu.jsx';
import { toLocalDayTime, longDay, formatTime, durationText } from '../lib/dates.js';
import { money, makeWhatsApp, buildIcs } from '../lib/format.js';
import { capability, enableReminders, cancelLocal } from '../notifications.js';

export function Receipt({ token, settings }) {
  const [d, setD] = useState(undefined); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [menu, setMenu] = useState(false);
  const load = () => api.booking(token).then(setD).catch(e => { setErr(e.message); setD(null); });
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const cap = capability();
  if (d === undefined) return <div className="screen"><Spinner label="Cargando tu comprobante…" /></div>;
  const back = <a className="link back" href="#/"><ArrowLeft size={16} />Volver a reservar</a>;
  if (!d) return <div className="screen pad"><Notice tone="warn">{err || 'No encontramos esta cita. Revisa que el enlace esté completo.'}</Notice>{back}</div>;

  const { day, time } = toLocalDayTime(d.start_at);
  const cancelled = d.status === 'cancelled';
  const wa = makeWhatsApp(settings.whatsapp_phone, `Hola, soy ${d.client_name}. ${cancelled ? 'Tenía' : 'Reservé'} ${d.service_name} el ${longDay(day)} a las ${formatTime(time)}.`);
  const run = async fn => { setBusy(true); setErr(''); setMsg(''); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const downloadIcs = () => {
    const ics = buildIcs({ title: `${d.service_name} · ${settings.salon_name}`, start: new Date(d.start_at), end: new Date(d.end_at), description: `Cita en ${settings.salon_name}. Comprobante: ${location.origin}${location.pathname}#/cita/${token}`, location: settings.address, uid: token });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'cita-agenda-bella.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <div className="screen">
      <TopBar onMenu={() => setMenu(true)} />
      <SideMenu open={menu} onClose={() => setMenu(false)} items={[{ label: 'Reservar otra cita', icon: <ArrowLeft size={20} />, href: '#/' }, wa && { label: 'WhatsApp del salón', icon: <MessageCircle size={20} />, href: wa, external: true }].filter(Boolean)} />
      <main className="receipt pad">
        <div className={`receipt-hero ${cancelled ? 'cancelled' : ''}`}>{cancelled ? <XCircle size={44} /> : <CheckCircle2 size={44} />}<h1>{cancelled ? 'Cita cancelada' : '¡Tu cita está confirmada!'}</h1>
          <p>{cancelled ? 'Este horario ya fue liberado.' : 'Guarda este comprobante. También puedes abrirlo desde este enlace.'}</p></div>
        <dl className="detail">
          <div><dt>Clienta</dt><dd>{d.client_name}</dd></div><div><dt>Servicio</dt><dd>{d.service_name}</dd></div>
          <div><dt>Fecha</dt><dd>{longDay(day)}</dd></div><div><dt>Hora</dt><dd>{formatTime(time)}</dd></div>
          <div><dt>Duración</dt><dd>{durationText(d.duration_minutes)}</dd></div><div><dt>Precio de referencia</dt><dd>{money(d.price)}</dd></div>
          <div><dt>Estado</dt><dd><span className={`pill ${cancelled ? 'bad' : 'ok'}`}>{cancelled ? 'Cancelada' : 'Confirmada'}</span></dd></div>
        </dl>
        {err && <Notice tone="error">{err}</Notice>}{msg && <Notice tone="ok">{msg}</Notice>}
        {!cancelled && <>
          {wa && <a className="btn primary block" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} />Abrir WhatsApp del salón</a>}
          <button className="btn ghost block" onClick={downloadIcs}><CalendarPlus size={20} />Guardar en mi calendario</button>
          <div className="remind-box">
            <h3><Bell size={18} />Recordatorios</h3>
            <p>{d.whatsapp_opt_in
              ? (settings.whatsapp_reminders_active ? 'Autorizaste un recordatorio por WhatsApp: lo recibirás el día anterior.' : 'Autorizaste el recordatorio por WhatsApp, pero el envío automático aún no está activo en este salón. Te escribirán manualmente si hace falta.')
              : 'No autorizaste recordatorios por WhatsApp para esta cita.'}</p>
            {d.whatsapp_opt_in && <button className="link" disabled={busy} onClick={() => run(async () => { await api.revokeWhatsApp(token); setMsg('Listo: ya no recibirás recordatorios por WhatsApp.'); load(); })}>Retirar permiso de WhatsApp</button>}
            <p className="muted">{cap.text}</p>
            {cap.ok && <button className="btn ghost block" disabled={busy} onClick={() => run(async () => { await enableReminders(api, token, d, settings.reminder_hour); setMsg('Avisos activados en este teléfono.'); })}><Bell size={18} />Activar avisos en este teléfono</button>}
          </div>
          {d.can_cancel
            ? <button className="btn danger block" onClick={() => setConfirm(true)}>Cancelar mi cita</button>
            : <p className="muted"><Clock3 size={14} /> Para cancelar con menos de {d.cancel_min_hours} horas de anticipación, escribe al salón por WhatsApp.</p>}
        </>}
        {back}
      </main>
      {confirm && <Sheet title="¿Cancelar tu cita?" onClose={() => setConfirm(false)} footer={<><button className="btn ghost" onClick={() => setConfirm(false)}>No, conservar</button>
        <button className="btn danger" disabled={busy} onClick={() => run(async () => { await api.cancel(token); await cancelLocal(token); setConfirm(false); load(); })}>Sí, cancelar</button></>}>
        <p>Se liberará el horario del {longDay(day)} a las {formatTime(time)}. Esta acción no se puede deshacer.</p></Sheet>}
    </div>
  );
}
