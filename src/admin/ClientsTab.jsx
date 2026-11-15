import { useMemo, useState } from 'react';
import { Search, ChevronRight, User } from 'lucide-react';
import { Sheet } from '../components/ui.jsx';
import { WhatsAppIcon } from '../components/Icons.jsx';
import { prettyPhone, makeWhatsApp, initials } from '../lib/format.js';
import { toLocalDayTime, shortDay, formatTime } from '../lib/dates.js';

export function groupClients(bookings) {
  const m = new Map();
  for (const b of bookings) {
    const c = m.get(b.phone) || { phone: b.phone, name: b.client_name, items: [] };
    c.items.push(b); if (new Date(b.created_at) >= new Date(c.items[0].created_at)) c.name = b.client_name; m.set(b.phone, c);
  }
  const now = Date.now();
  return [...m.values()].map(c => {
    const done = c.items.filter(b => b.status === 'confirmed' && new Date(b.end_at) <= now); const next = c.items.filter(b => b.status === 'confirmed' && new Date(b.start_at) > now).sort((a, b) => a.start_at.localeCompare(b.start_at))[0];
    return { ...c, visits: done.length, last: done.at(-1) || null, next: next || null, cancelled: c.items.filter(b => b.status === 'cancelled').length };
  }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function ClientsTab({ bookings, salon, onEdit }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(null);
  const all = useMemo(() => groupClients(bookings), [bookings]);
  const list = all.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q.replace(/\D/g, '') || '__'));
  const cur = open && all.find(c => c.phone === open);
  return (
    <section className="tab">
      <div className="h-row admin"><span className="h-box"><User size={28} strokeWidth={1.5} /></span><div><h1>Clientas</h1><p>{all.length} registrada{all.length === 1 ? '' : 's'} · historial de visitas.</p></div></div>
      <label className="search"><Search size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono" aria-label="Buscar clienta" /></label>
      {list.length === 0 ? <div className="empty"><p>{all.length ? 'Sin resultados.' : 'Aún no hay clientas. Aparecerán aquí al recibir la primera reservación.'}</p></div> :
        <ul className="clients">{list.map(c => (
          <li key={c.phone}><button onClick={() => setOpen(c.phone)}><span className="avatar">{initials(c.name)}</span><span className="u-txt"><b>{c.name}</b><small>{prettyPhone(c.phone)} · {c.visits} visita{c.visits === 1 ? '' : 's'}{c.next ? ` · próxima ${shortDay(toLocalDayTime(c.next.start_at).day)}` : ''}</small></span><ChevronRight size={18} /></button></li>))}</ul>}
      {cur && <Sheet title={cur.name} onClose={() => setOpen(null)}>
        <div className="sum"><span>{prettyPhone(cur.phone)}</span><span>{cur.visits} visita(s) · {cur.cancelled} cancelación(es)</span></div>
        <a className="btn primary block" href={makeWhatsApp(cur.phone, `Hola ${cur.name}, te escribimos de ${salon.salon_name}.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={20} />Escribir por WhatsApp</a>
        <h4 className="sub">Historial</h4>
        <ul className="history">{[...cur.items].reverse().map(b => { const t = toLocalDayTime(b.start_at); return (
          <li key={b.id}><button onClick={() => { setOpen(null); onEdit(b); }}><span><b>{shortDay(t.day)} {t.day.slice(0, 4)}</b> · {formatTime(t.time)}</span><span>{b.service?.name}</span><em className={b.status === 'cancelled' ? 'bad' : ''}>{b.status === 'cancelled' ? 'Cancelada' : new Date(b.end_at) < new Date() ? 'Realizada' : 'Próxima'}</em></button></li>); })}</ul>
      </Sheet>}
    </section>
  );
}
