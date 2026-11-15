import { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export function Spinner({ label = 'Cargando…' }) { return <div className="spinner" role="status"><span className="spin" />{label}</div>; }

export function Notice({ tone = 'info', children, action }) {
  const I = tone === 'ok' ? CheckCircle2 : tone === 'warn' || tone === 'error' ? AlertTriangle : Info;
  return <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}><I size={18} /><div>{children}</div>{action}</div>;
}

export function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey); document.body.classList.add('lock');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('lock'); };
  }, [onClose]);
  return (
    <div className="sheet-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  return <label className="field"><span>{label}</span>{children}{hint && !error && <small>{hint}</small>}{error && <small className="err">{error}</small>}</label>;
}
export function Toggle({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i /></button>;
}
