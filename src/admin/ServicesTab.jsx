import { useState } from 'react';
import { Plus, Scissors, Pencil } from 'lucide-react';
import { api } from '../api/index.js';
import { Sheet, Field, Notice, Toggle } from '../components/ui.jsx';
import { ServiceIcon, ICON_CHOICES } from '../components/Icons.jsx';
import { money } from '../lib/format.js';
import { durationText } from '../lib/dates.js';

const DURATIONS = Array.from({ length: 24 }, (_, i) => (i + 1) * 15);

export function ServicesTab({ services, onChanged }) {
  const [edit, setEdit] = useState(null);
  return (
    <section className="tab">
      <div className="h-row admin"><span className="h-box"><Scissors size={28} strokeWidth={1.5} /></span><div><h1>Servicios</h1><p>Precios, duraciones y visibilidad.</p></div></div>
      <ul className="svc-admin">{services.map(s => (
        <li key={s.id} className={s.active ? '' : 'off'}><button onClick={() => setEdit(s)}>
          <span className="svc-ico"><ServiceIcon name={s.icon} /></span><span className="u-txt"><b>{s.name}</b><small>{durationText(s.duration_minutes)} · {money(s.price)} · {s.category}{s.active ? '' : ' · oculto'}</small></span><Pencil size={17} /></button></li>))}</ul>
      <div className="fab-row"><button className="btn primary" onClick={() => setEdit({ name: '', category: 'Cabello', description: '', icon: 'sparkles', price: '', duration_minutes: 60, active: true, sort_order: services.length + 1 })}><Plus size={18} />Nuevo servicio</button></div>
      {edit && <ServiceEditor s={edit} cats={[...new Set(services.map(s => s.category))]} onClose={() => setEdit(null)} onSaved={async () => { setEdit(null); await onChanged(); }} />}
    </section>
  );
}

function ServiceEditor({ s, cats, onClose, onSaved }) {
  const [f, setF] = useState({ ...s, price: s.price ?? '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (f.name.trim().length < 2) return setErr('Escribe el nombre del servicio.');
    if (!(Number(f.price) >= 0) || f.price === '') return setErr('Escribe un precio válido.');
    setBusy(true); try { await api.adminSaveService(f); await onSaved(); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Sheet title={s.id ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Nombre"><input value={f.name} maxLength={80} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Categoría"><input list="cats" value={f.category} maxLength={40} onChange={e => setF({ ...f, category: e.target.value })} /><datalist id="cats">{cats.map(c => <option key={c} value={c} />)}</datalist></Field>
        <Field label="Descripción corta (opcional)"><input value={f.description || ''} maxLength={140} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        <div className="two"><Field label="Precio (MXN)"><input inputMode="decimal" value={f.price} onChange={e => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
          <Field label="Duración"><select value={f.duration_minutes} onChange={e => setF({ ...f, duration_minutes: Number(e.target.value) })}>{DURATIONS.map(m => <option key={m} value={m}>{durationText(m)}</option>)}</select></Field></div>
        <div className="icons" role="radiogroup" aria-label="Icono">{ICON_CHOICES.map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={f.icon === k} aria-label={l} className={f.icon === k ? 'on' : ''} onClick={() => setF({ ...f, icon: k })}><ServiceIcon name={k} /></button>)}</div>
        <div className="toggle-row"><span>Visible para las clientas<small>Si lo ocultas, no se puede reservar, pero las citas ya hechas se conservan.</small></span><Toggle checked={f.active} onChange={v => setF({ ...f, active: v })} label="Visible" /></div>
        {err && <Notice tone="error">{err}</Notice>}<button className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Sheet>
  );
}
