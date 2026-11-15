import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Calendar, Plus, Ban } from 'lucide-react';
import { api } from '../api/index.js';
import { AppointmentCard } from './AppointmentCard.jsx';
import { MonthCalendar } from '../components/MonthCalendar.jsx';
import { Sheet, Field, Notice } from '../components/ui.jsx';
import { addDays, addMonths, firstOfMonth, startOfWeek, shortDay, longDay, weekdayShort, toLocalDayTime, formatTime, localToday } from '../lib/dates.js';

const VIEWS = [['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']];

export function AgendaTab({ bookings, services, salon, day, setDay, onEdit, onNew, onChanged }) {
  const [view, setView] = useState('day'); const [month, setMonth] = useState(firstOfMonth(day)); const [block, setBlock] = useState(false);
  const today = localToday();
  const active = useMemo(() => bookings.filter(b => b.status === 'confirmed'), [bookings]);
  const byDay = useMemo(() => { const m = {}; for (const b of bookings) (m[toLocalDayTime(b.start_at).day] ||= []).push(b); return m; }, [bookings]);
  const counts = useMemo(() => Object.fromEntries(Object.entries(byDay).map(([d, l]) => [d, l.filter(b => b.status === 'confirmed').length])), [byDay]);
  const dayList = byDay[day] || []; const dayActive = dayList.filter(b => b.status === 'confirmed').length;
  const upcoming = active.filter(b => new Date(b.start_at) > new Date() && toLocalDayTime(b.start_at).day !== day).slice(0, 4);
  const step = view === 'week' ? 7 : 1;
  const go = n => { const d = addDays(day, n * step); setDay(d); setMonth(firstOfMonth(d)); };
  const pick = d => { setDay(d); setMonth(firstOfMonth(d)); };
  return (
    <section className="tab">
      <div className="h-row admin"><span className="h-box"><CalendarDays size={30} strokeWidth={1.5} /></span><div><h1>Mi agenda</h1><p>Gestiona tus citas, clientas y horarios.</p></div></div>
      <div className="date-nav">
        <button className="icon-btn ghost" onClick={() => go(-1)} aria-label="Anterior"><ChevronLeft size={24} /></button>
        <label className="date-pill"><Calendar size={19} /><span>{day === today ? 'Hoy · ' : ''}{shortDay(day)}</span><ChevronDown size={18} /><input type="date" value={day} onChange={e => e.target.value && pick(e.target.value)} aria-label="Elegir fecha" /></label>
        <button className="icon-btn ghost" onClick={() => go(1)} aria-label="Siguiente"><ChevronRight size={24} /></button>
      </div>
      <div className="seg" role="tablist">{VIEWS.map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>

      {view === 'month' && <MonthCalendar mode="agenda" month={month} onMonth={n => setMonth(m => addMonths(m, n))} selected={day} onSelect={pick} counts={counts} />}
      {view === 'week' && <div className="week">{Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(day), i)).map(d => (
        <div key={d} className={`week-day ${d === day ? 'cur' : ''}`}>
          <button className="week-head" onClick={() => { pick(d); setView('day'); }}><b>{weekdayShort(d)} {Number(d.slice(8))}</b><span>{counts[d] ? `${counts[d]} cita${counts[d] > 1 ? 's' : ''}` : 'Libre'}</span></button>
          {(byDay[d] || []).filter(b => b.status === 'confirmed').map(b => <button key={b.id} className="mini" onClick={() => onEdit(b)}><b>{formatTime(toLocalDayTime(b.start_at).time)}</b>{b.service?.name} · {b.client_name}</button>)}
        </div>))}</div>}

      {view !== 'week' && <>
        <div className="sec-head"><h2>{view === 'month' ? shortDay(day) : 'Citas del día'}</h2><span className="count">{dayActive} cita{dayActive === 1 ? '' : 's'}</span></div>
        {dayList.length === 0 ? <div className="empty"><Calendar size={28} /><p>No hay citas para {day === today ? 'hoy' : 'este día'}.</p><button className="btn ghost" onClick={() => onNew(day)}><Plus size={18} />Agregar cita manual</button></div>
          : dayList.map(b => <AppointmentCard key={b.id} b={b} salon={salon} onEdit={onEdit} />)}
      </>}

      {view === 'day' && upcoming.length > 0 && <>
        <div className="sec-head"><h2><Calendar size={20} />Próximas citas</h2></div>
        <ul className="upcoming">{upcoming.map(b => { const { day: d, time } = toLocalDayTime(b.start_at); return (
          <li key={b.id}><button onClick={() => { pick(d); }}><span className="u-ico"><Calendar size={20} /></span><span className="u-txt"><b>{shortDay(d)}</b><small>{b.service?.name} – {b.client_name}</small></span><span className="u-time">{formatTime(time)}</span><ChevronRight size={18} /></button></li>); })}</ul>
      </>}

      <div className="fab-row"><button className="btn primary" onClick={() => onNew(day)}><Plus size={18} />Nueva cita</button><button className="btn ghost" onClick={() => setBlock(true)}><Ban size={18} />Bloquear</button></div>
      {block && <BlockSheet day={day} onClose={() => setBlock(false)} onDone={onChanged} />}
    </section>
  );
}

export function BlockSheet({ day, onClose, onDone }) {
  const [f, setF] = useState({ start: day, end: day, partial: false, from: '13:00', to: '15:00', reason: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [res, setRes] = useState(null);
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await api.adminBlock({ startDay: f.start, endDay: f.partial ? f.start : f.end, startTime: f.partial ? f.from : null, endTime: f.partial ? f.to : null, reason: f.reason }); setRes(r); await onDone(); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Sheet title="Bloquear fechas u horas" onClose={onClose}>
      {res ? <><Notice tone={res.affected_bookings ? 'warn' : 'ok'}>{res.affected_bookings ? `Se bloqueó, pero ya hay ${res.affected_bookings} cita(s) en ese periodo. No se cancelaron: revísalas en la agenda y avisa a las clientas.` : 'Listo: ese periodo ya no está disponible para reservar.'}</Notice><button className="btn primary block" onClick={onClose}>Cerrar</button></>
      : <form onSubmit={submit}>
        <div className="two"><Field label="Desde"><input type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value, end: f.end < e.target.value ? e.target.value : f.end })} required /></Field>
          <Field label="Hasta"><input type="date" value={f.partial ? f.start : f.end} min={f.start} disabled={f.partial} onChange={e => setF({ ...f, end: e.target.value })} required /></Field></div>
        <label className="check"><input type="checkbox" checked={f.partial} onChange={e => setF({ ...f, partial: e.target.checked })} /><span>Solo unas horas de ese día</span></label>
        {f.partial && <div className="two"><Field label="De"><input type="time" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} /></Field><Field label="A"><input type="time" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} /></Field></div>}
        <Field label="Motivo (privado)"><input value={f.reason} maxLength={120} onChange={e => setF({ ...f, reason: e.target.value })} placeholder="Vacaciones, cita médica, feriado…" /></Field>
        {err && <Notice tone="error">{err}</Notice>}<button className="btn primary block" disabled={busy}>{busy ? 'Bloqueando…' : 'Bloquear'}</button></form>}
    </Sheet>
  );
}
