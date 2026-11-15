import { useState } from 'react';
import { api } from '../api/index.js';
import { Sheet, Field, Notice } from '../components/ui.jsx';
import { validatePhone, normalizePhone } from '../lib/format.js';

export function NewBooking({ services, defaultDay, onClose, onCreated }) {
  const [f, setF] = useState({ service_id: services[0]?.id || '', day: defaultDay, time: '10:00', client_name: '', phone: '', notes: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [force, setForce] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (f.client_name.trim().length < 2) return setErr('Escribe el nombre de la clienta.');
    if (!validatePhone(f.phone)) return setErr('El teléfono debe tener 10 dígitos.');
    setBusy(true);
    try { await api.adminCreateBooking({ ...f, phone: normalizePhone(f.phone), ignore_time_off: force }); await onCreated(f.day); }
    catch (e2) { setErr(e2.message); setForce(/bloqueado/i.test(e2.message)); } finally { setBusy(false); }
  };
  return (
    <Sheet title="Nueva cita manual" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Servicio"><select value={f.service_id} onChange={set('service_id')}>{services.map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (oculto)'}</option>)}</select></Field>
        <div className="two"><Field label="Fecha"><input type="date" value={f.day} onChange={set('day')} required /></Field><Field label="Hora"><input type="time" step="900" value={f.time} onChange={set('time')} required /></Field></div>
        <Field label="Nombre de la clienta"><input value={f.client_name} onChange={set('client_name')} maxLength={70} /></Field>
        <Field label="Celular"><input inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="999 123 4567" /></Field>
        <Field label="Notas privadas"><input value={f.notes} onChange={set('notes')} maxLength={500} /></Field>
        <p className="muted">Las citas manuales no activan recordatorios por WhatsApp porque la clienta no dio su autorización en la app.</p>
        {err && <Notice tone="error">{err}</Notice>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : force ? 'Reservar de todos modos' : 'Guardar cita'}</button>
      </form>
    </Sheet>
  );
}
