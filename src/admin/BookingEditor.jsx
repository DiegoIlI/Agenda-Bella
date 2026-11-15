import { useState } from 'react';
import { api } from '../api/index.js';
import { Sheet, Field, Notice } from '../components/ui.jsx';
import { toLocalDayTime, longDay, formatTime, durationText } from '../lib/dates.js';
import { prettyPhone, makeWhatsApp } from '../lib/format.js';
import { waText } from './AppointmentCard.jsx';
import { MessageCircle } from 'lucide-react';

export function BookingEditor({ b, salon, onClose, onChanged }) {
  const cur = toLocalDayTime(b.start_at);
  const [day, setDay] = useState(cur.day); const [time, setTime] = useState(cur.time); const [notes, setNotes] = useState(b.notes || '');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [ask, setAsk] = useState(false); const [reason, setReason] = useState('');
  const cancelled = b.status === 'cancelled'; const moved = day !== cur.day || time !== cur.time;
  const run = async (fn, done) => { setBusy(true); setErr(''); setOk(''); try { await fn(); await onChanged(); if (done) done(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <Sheet title="Detalle de la cita" onClose={onClose}>
      <div className="sum"><b>{b.service?.name}</b><span>{b.client_name} · {prettyPhone(b.phone)}</span><span>{longDay(cur.day)} · {formatTime(cur.time)} · {durationText(Math.round((new Date(b.end_at) - new Date(b.start_at)) / 60000))}</span>
        <span>Reservada por {b.created_by === 'admin' ? 'la dueña' : 'la clienta'} · WhatsApp {b.whatsapp_opt_in ? 'autorizado' : 'sin autorización'}</span></div>
      <a className="btn ghost block" href={makeWhatsApp(b.phone, waText(b, salon))} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />Escribir por WhatsApp</a>
      {err && <Notice tone="error">{err}</Notice>}{ok && <Notice tone="ok">{ok}</Notice>}
      {!cancelled && <>
        <h4 className="sub">Reprogramar</h4>
        <div className="two"><Field label="Fecha"><input type="date" value={day} onChange={e => setDay(e.target.value)} /></Field><Field label="Hora"><input type="time" step="900" value={time} onChange={e => setTime(e.target.value)} /></Field></div>
        <button className="btn primary block" disabled={busy || !moved || !day || !time} onClick={() => run(() => api.adminReschedule(b.id, day, time), () => setOk('Cita reprogramada. Avísale a la clienta por WhatsApp.'))}>Guardar nuevo horario</button>
      </>}
      <Field label="Notas privadas (solo tú las ves)"><textarea rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. prefiere tono cobrizo, alérgica a…" /></Field>
      <button className="btn ghost block" disabled={busy || notes === (b.notes || '')} onClick={() => run(() => api.adminSaveNotes(b.id, notes), () => setOk('Notas guardadas.'))}>Guardar notas</button>
      {!cancelled && (ask
        ? <div className="confirm-box"><Field label="Motivo (opcional)"><input value={reason} maxLength={200} onChange={e => setReason(e.target.value)} /></Field>
            <div className="row"><button className="btn ghost" onClick={() => setAsk(false)}>No cancelar</button><button className="btn danger" disabled={busy} onClick={() => run(() => api.adminCancel(b.id, reason), onClose)}>Sí, cancelar cita</button></div></div>
        : <button className="btn danger block" onClick={() => setAsk(true)}>Cancelar esta cita</button>)}
    </Sheet>
  );
}
