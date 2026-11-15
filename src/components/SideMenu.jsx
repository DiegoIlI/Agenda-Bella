import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Brand } from './Brand.jsx';

export function SideMenu({ open, onClose, items, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <div className={`side-wrap ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="side-back" onClick={onClose} />
      <aside className="side" role="dialog" aria-label="Menú">
        <div className="side-head"><Brand small /><button className="icon-btn ghost" onClick={onClose} aria-label="Cerrar menú"><X size={22} /></button></div>
        <nav>{items.map(it => it.href
          ? <a key={it.label} href={it.href} target={it.external ? '_blank' : undefined} rel="noopener noreferrer" onClick={onClose}>{it.icon}{it.label}</a>
          : <button key={it.label} onClick={() => { onClose(); it.onClick?.(); }}>{it.icon}{it.label}</button>)}</nav>
        {footer && <div className="side-foot">{footer}</div>}
      </aside>
    </div>
  );
}
