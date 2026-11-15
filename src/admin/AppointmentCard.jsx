import { User, Phone, Check, Pencil } from 'lucide-react';
import { WhatsAppIcon } from '../components/Icons.jsx';
import { toLocalDayTime, hourParts, longDay, formatTime } from '../lib/dates.js';
import { prettyPhone, makeWhatsApp } from '../lib/format.js';

export const waText = (b, salon) => {
  const { day, time } = toLocalDayTime(b.start_at);
  return `Hola ${b.client_name}, te escribimos de ${salon?.salon_name || 'Agenda Bella'} sobre tu cita de ${b.service?.name || 'servicio'} el ${longDay(day)} a las ${formatTime(time)}.`;
};

export function AppointmentCard({ b, salon, onEdit }) {
  const { time } = toLocalDayTime(b.start_at); const { time: t, suffix } = hourParts(time); const cancelled = b.status === 'cancelled';
  return (
    <article className={`appt ${cancelled ? 'cancelled' : ''}`}>
      <div className="appt-time"><b>{t}</b><span>{suffix}</span></div>
      <div className="appt-body">
        <h4>{b.service?.name || 'Servicio'}</h4>
        <p><User size={15} />{b.client_name}</p>
        <p><Phone size={15} />{prettyPhone(b.phone)}</p>
        {b.notes && <p className="note">“{b.notes}”</p>}
      </div>
      <div className="appt-side">
        <span className={`badge-status ${cancelled ? 'bad' : 'ok'}`}>{!cancelled && <Check size={13} strokeWidth={3} />}{cancelled ? 'Cancelada' : 'Confirmada'}</span>
        <div className="appt-actions">
          <a className="round wa" href={makeWhatsApp(b.phone, waText(b, salon))} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${b.client_name}`}><WhatsAppIcon size={22} /></a>
          <button className="round" onClick={() => onEdit(b)} aria-label={`Editar cita de ${b.client_name}`}><Pencil size={18} /></button>
        </div>
      </div>
    </article>
  );
}
