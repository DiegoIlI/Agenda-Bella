import { useCallback, useEffect, useState } from 'react';
import { api, mode } from './api/index.js';
import { ClientBooking } from './client/ClientBooking.jsx';
import { Receipt } from './client/Receipt.jsx';
import { AdminApp } from './admin/AdminApp.jsx';
import { Spinner, Notice } from './components/ui.jsx';
import { TopBar } from './components/Brand.jsx';
import { DEFAULT_SALON_PHONE } from './config.js';
import { makeWhatsApp } from './lib/format.js';
import { reconcileLocal } from './notifications.js';

const useHash = () => { const [h, setH] = useState(location.hash); useEffect(() => { const f = () => { setH(location.hash); window.scrollTo(0, 0); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []); return h; };

function SetupPending() {
  const wa = makeWhatsApp(DEFAULT_SALON_PHONE, 'Hola, quiero agendar una cita.');
  return (
    <div className="screen"><TopBar onMenu={() => {}} />
      <main className="pad setup"><Notice tone="warn"><b>Reservaciones en línea no disponibles todavía.</b> La aplicación aún no está conectada a su base de datos, así que por ahora no se pueden registrar citas aquí.</Notice>
        <p>Mientras tanto, puedes agendar escribiendo directamente al salón:</p>
        <a className="btn primary block" href={wa} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
        <details><summary>Para quien administra la app</summary><p>Configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en el hosting y vuelve a compilar. Pasos en <code>docs/PASO_A_PASO.md</code>.</p></details></main></div>
  );
}

export default function App() {
  const hash = useHash();
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setData(await api.getPublic()); setError(''); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { if (mode !== 'unconfigured') load(); }, [load]);
  useEffect(() => { if (data?.settings) reconcileLocal(api, data.settings.reminder_hour); }, [data?.settings?.reminder_hour]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (data?.settings?.salon_name) document.title = `${data.settings.salon_name} · Reservaciones`; }, [data?.settings?.salon_name]);

  if (mode === 'unconfigured') return <SetupPending />;
  if (error && !data) return <div className="screen pad"><Notice tone="error" action={<button className="link" onClick={load}>Reintentar</button>}>{error}</Notice></div>;
  if (!data) return <div className="screen"><Spinner /></div>;
  if (hash.startsWith('#/admin')) return <AdminApp salon={data.settings} reloadPublic={load} />;
  const m = hash.match(/^#\/cita\/([0-9a-f-]{36})$/i);
  if (m) return <Receipt token={m[1]} settings={data.settings} />;
  if (!data.services.length) return <div className="screen pad"><Notice>El salón aún no tiene servicios disponibles. Escríbenos por WhatsApp.</Notice></div>;
  return <ClientBooking data={data} />;
}
