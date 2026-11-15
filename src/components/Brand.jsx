import { Menu, Bell } from 'lucide-react';
import { LotusMark, WhatsAppIcon } from './Icons.jsx';
import { mode } from '../config.js';

export function Brand({ small }) {
  return (<div className={`brand ${small ? 'small' : ''}`}><LotusMark size={small ? 30 : 38} /><div><b>Agenda Bella</b><span>BEAUTY STUDIO</span></div></div>);
}
// Barra superior. La zona segura (isla dinámica/hora) se respeta UNA sola vez con --safe-top.
export function TopBar({ onMenu, right }) {
  return (<div className="topwrap"><header className="topbar"><button className="icon-btn ghost" onClick={onMenu} aria-label="Abrir menú"><Menu size={24} /></button><Brand />{right || <span className="icon-spacer" />}</header>
    {mode === 'demo' && <div className="demo-strip">Modo demostración · los datos viven solo en este navegador</div>}</div>);
}
export const WhatsAppBtn = ({ href, label = 'WhatsApp' }) => <a className="icon-btn ghost wa" href={href} target="_blank" rel="noopener noreferrer" aria-label={label}><WhatsAppIcon size={26} /></a>;
export const BellBtn = ({ count, onClick }) => <button className="icon-btn ghost bell" onClick={onClick} aria-label={count ? `${count} reservaciones nuevas` : 'Notificaciones'}><Bell size={24} />{count > 0 && <i className="dot" />}</button>;
