import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel, firstOfMonth, dayOfWeek, daysInMonth, addDays, localToday } from '../lib/dates.js';

const WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
// info: { 'YYYY-MM-DD': {free, total} } · mode 'booking' (disponible/ocupado) o 'agenda' (cantidad de citas)
export function MonthCalendar({ month, onMonth, selected, onSelect, info = {}, mode = 'booking', counts = {}, canPrev = true, canNext = true, loading }) {
  const first = firstOfMonth(month); const lead = dayOfWeek(first); const total = daysInMonth(first); const today = localToday();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => addDays(first, i))];
  return (
    <section className="cal" aria-label="Calendario" aria-busy={!!loading}>
      <div className="cal-head">
        <button className="icon-btn ghost" onClick={() => onMonth(-1)} disabled={!canPrev} aria-label="Mes anterior"><ChevronLeft size={22} /></button>
        <h3>{monthLabel(first)}</h3>
        <button className="icon-btn ghost" onClick={() => onMonth(1)} disabled={!canNext} aria-label="Mes siguiente"><ChevronRight size={22} /></button>
      </div>
      <div className="cal-week">{WEEK.map(w => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const n = Number(d.slice(8)); const sel = d === selected;
          if (mode === 'agenda') {
            const c = counts[d] || 0;
            return <button key={d} className={`day ${sel ? 'sel' : ''} ${d === today ? 'today' : ''}`} onClick={() => onSelect(d)} aria-label={`${n}${c ? `, ${c} citas` : ''}`}>{n}{c > 0 && <em className="badge">{c}</em>}</button>;
          }
          const x = info[d]; const past = d < today;
          const state = past || !x || x.total_slots === 0 ? 'closed' : x.free_slots > 0 ? 'free' : 'full';
          return <button key={d} className={`day ${state} ${sel ? 'sel' : ''}`} disabled={state !== 'free'} onClick={() => onSelect(d)} aria-label={`${n}, ${state === 'free' ? 'disponible' : state === 'full' ? 'ocupado' : 'sin atención'}`} aria-pressed={sel}>{n}</button>;
        })}
      </div>
      {mode === 'booking' && <div className="cal-legend"><span><i className="d free" />Disponible</span><span><i className="d full" />Ocupado</span></div>}
    </section>
  );
}
