import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Users, Scissors, Settings, Link2, LogOut } from 'lucide-react';
import { api, mode } from '../api/index.js';
import { TopBar, BellBtn } from '../components/Brand.jsx';
import { SideMenu } from '../components/SideMenu.jsx';
import { Sheet, Spinner, Notice } from '../components/ui.jsx';
import { Login } from './Login.jsx';
import { AgendaTab } from './AgendaTab.jsx';
import { ClientsTab } from './ClientsTab.jsx';
import { ServicesTab } from './ServicesTab.jsx';
import { SettingsTab } from './SettingsTab.jsx';
import { BookingEditor } from './BookingEditor.jsx';
import { NewBooking } from './NewBooking.jsx';
import { localToday, addDays, shortDay, toLocalDayTime, formatTime } from '../lib/dates.js';
import { prettyPhone } from '../lib/format.js';

const TABS = [['agenda', 'Agenda', CalendarDays], ['clientas', 'Clientas', Users], ['servicios', 'Servicios', Scissors], ['ajustes', 'Ajustes', Settings]];

export function AdminApp({ salon, reloadPublic }) {
  const [user, setUser] = useState(undefined); const [denied, setDenied] = useState(false);
  useEffect(() => { api.getSessionUser().then(async u => { if (u && await api.isStaff(u.id).catch(() => false)) setUser(u); else { setUser(null); if (u) { setDenied(true); api.signOut(); } } }).catch(() => setUser(null)); }, []);
  const onLogin = async u => { if (await api.isStaff(u.id).catch(() => false)) { setDenied(false); setUser(u); } else { await api.signOut(); setDenied(true); setUser(null); } };
  if (user === undefined) return <div className="screen"><Spinner /></div>;
  if (!user) return <Login onDone={onLogin} denied={denied} />;
  return <Panel salon={salon} reloadPublic={reloadPublic} onLogout={async () => { await api.signOut(); setUser(null); }} />;
}

function Panel({ salon, reloadPublic, onLogout }) {
  const today = localToday();
  const [tab, setTab] = useState('agenda'); const [menu, setMenu] = useState(false); const [day, setDay] = useState(today);
  const [bookings, setBookings] = useState(null); const [services, setServices] = useState([]); const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null); const [creating, setCreating] = useState(null); const [bell, setBell] = useState(false);
  const seen = useRef(Number(localStorage.getItem('ab_bell_seen') || 0));
  const [seenAt, setSeenAt] = useState(seen.current);

  const load = useCallback(async () => {
    try {
      const [b, s] = await Promise.all([api.adminBookings({ from: addDays(today, -120), to: addDays(today, 200) }), api.adminServices()]);
      setBookings(b); setServices(s); setErr('');
    } catch (e) { setErr(e.message); setBookings(cur => cur || []); }
  }, [today]);
  useEffect(() => { load(); const off = api.onBookingsChanged(load); const t = setInterval(load, 45000); const vis = () => document.visibilityState === 'visible' && load(); document.addEventListener('visibilitychange', vis); return () => { off?.(); clearInterval(t); document.removeEventListener('visibilitychange', vis); }; }, [load]);

  const fresh = useMemo(() => (bookings || []).filter(b => b.status === 'confirmed' && b.created_by === 'client' && Date.now() - new Date(b.created_at) < 48 * 3600000 && new Date(b.created_at) > seenAt).sort((a, b) => b.created_at.localeCompare(a.created_at)), [bookings, seenAt]);
  const openBell = () => { setBell(true); const now = Date.now(); try { localStorage.setItem('ab_bell_seen', String(now)); } catch { /* */ } };
  const closeBell = () => { setBell(false); setSeenAt(Date.now()); };
  const editing = edit && bookings?.find(b => b.id === edit.id);
  const changed = async () => { await load(); await reloadPublic?.(); };

  return (
    <div className="screen admin">
      <TopBar onMenu={() => setMenu(true)} right={<BellBtn count={fresh.length} onClick={openBell} />} />
      <SideMenu open={menu} onClose={() => setMenu(false)} items={[
        ...TABS.map(([k, l, I]) => ({ label: l, icon: <I size={20} />, onClick: () => setTab(k) })),
        { label: 'Ver app de clientas', icon: <Link2 size={20} />, href: '#/' }, { label: 'Cerrar sesión', icon: <LogOut size={20} />, onClick: onLogout }]} />
      <main className="admin-main">
        {err && <Notice tone="error" action={<button className="link" onClick={load}>Reintentar</button>}>{err}</Notice>}
        {bookings === null ? <Spinner /> : <>
          {tab === 'agenda' && <AgendaTab bookings={bookings} services={services} salon={salon} day={day} setDay={setDay} onEdit={setEdit} onNew={d => setCreating(d)} onChanged={changed} />}
          {tab === 'clientas' && <ClientsTab bookings={bookings} salon={salon} onEdit={setEdit} />}
          {tab === 'servicios' && <ServicesTab services={services} onChanged={changed} />}
          {tab === 'ajustes' && <SettingsTab salon={salon} bookings={bookings} mode={mode} onSaved={changed} onLogout={onLogout} />}
        </>}
      </main>
      <nav className="tabbar" aria-label="Navegación principal">{TABS.map(([k, l, I]) => <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => { setTab(k); window.scrollTo({ top: 0 }); }}><I size={24} strokeWidth={1.6} /><span>{l}</span></button>)}</nav>
      {editing && <BookingEditor b={editing} salon={salon} onClose={() => setEdit(null)} onChanged={changed} />}
      {creating && <NewBooking services={services} defaultDay={creating} onClose={() => setCreating(null)} onCreated={async d => { setCreating(null); setDay(d); await changed(); }} />}
      {bell && <Sheet title="Reservaciones nuevas" onClose={closeBell}>{fresh.length === 0 && bookings?.length >= 0 ? <p className="muted">No hay reservaciones nuevas de las últimas 48 horas.</p> :
        <ul className="history">{fresh.map(b => { const t = toLocalDayTime(b.start_at); return <li key={b.id}><button onClick={() => { closeBell(); setTab('agenda'); setDay(t.day); }}><span><b>{b.client_name}</b> · {prettyPhone(b.phone)}</span><span>{b.service?.name} · {shortDay(t.day)} {formatTime(t.time)}</span></button></li>; })}</ul>}</Sheet>}
    </div>
  );
}
