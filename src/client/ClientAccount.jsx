import { useEffect, useState } from 'react';
import { ArrowLeft, UserRound } from 'lucide-react';
import { api, mode } from '../api/index.js';
import { Brand } from '../components/Brand.jsx';
import { Field, Notice, Spinner } from '../components/ui.jsx';

export function ClientAccount() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [view, setView] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'live') { setUser(null); return; }
    api.getSessionUser().then(async u => {
      setUser(u);
      if (u) setProfile(await api.getClientProfile().catch(() => ({ full_name: '', phone: '' })));
    }).catch(e => { setUser(null); setError(e.message); });
  }, []);

  const submit = async event => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      if (view === 'signup') {
        const r = await api.registerClient(form);
        if (!r.session) {
          setMessage('Cuenta creada. Revisa tu correo, confirma tu dirección y después inicia sesión.');
          setView('signin');
          return;
        }
        setUser(r.user);
        setProfile(await api.getClientProfile());
      } else {
        const u = await api.signIn(form.email.trim(), form.password);
        setUser(u);
        setProfile(await api.getClientProfile());
      }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const save = async e => {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      await api.saveClientProfile(profile);
      setMessage('Tus datos se guardaron. Se usarán para completar futuras reservaciones.');
    } catch (ex) { setError(ex.message); } finally { setBusy(false); }
  };

  return <div className="screen login pad">
    <a className="link back" href="#/"><ArrowLeft size={16}/> Volver a reservar</a>
    <div className="login-brand"><Brand /></div>
    <div className="login-card">
      <h1><UserRound size={22}/> Mi cuenta (opcional)</h1>
      <p className="muted">Puedes reservar sin registrarte. Tener cuenta solo sirve para guardar tu nombre y celular y completar más rápido tus próximas citas.</p>
      {mode !== 'live' && <Notice tone="warn">El registro solo está disponible cuando Supabase está conectado.</Notice>}
      {user === undefined ? <Spinner /> : user ? <>
        <p className="muted">Sesión: {user.email}</p>
        <form onSubmit={save}>
          <Field label="Nombre completo"><input required minLength={2} maxLength={70} autoComplete="name" value={profile.full_name || ''} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}/></Field>
          <Field label="Celular (WhatsApp)"><input required minLength={10} maxLength={20} inputMode="tel" autoComplete="tel" value={profile.phone || ''} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}/></Field>
          <button className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar mis datos'}</button>
        </form>
        <button className="btn ghost block" onClick={async () => { await api.signOut(); setUser(null); setMessage('Sesión cerrada.'); }}>Cerrar sesión</button>
      </> : <>
        <div className="auth-switch" role="group" aria-label="Acceso de clientas">
          <button className={view === 'signin' ? 'on' : ''} onClick={() => { setView('signin'); setError(''); }}>Iniciar sesión</button>
          <button className={view === 'signup' ? 'on' : ''} onClick={() => { setView('signup'); setError(''); }}>Crear cuenta</button>
        </div>
        <form onSubmit={submit}>
          {view === 'signup' && <>
            <Field label="Nombre completo"><input required minLength={2} maxLength={70} autoComplete="name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}/></Field>
            <Field label="Celular (WhatsApp)"><input required pattern="[0-9 +()-]{10,20}" maxLength={20} inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/></Field>
          </>}
          <Field label="Correo"><input required type="email" autoComplete="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/></Field>
          <Field label="Contraseña"><input required minLength={8} type="password" autoComplete={view === 'signup' ? 'new-password' : 'current-password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}/></Field>
          <button className="btn primary block" disabled={busy || mode !== 'live'}>{busy ? 'Procesando…' : view === 'signup' ? 'Crear mi cuenta' : 'Entrar a mi cuenta'}</button>
        </form>
      </>}
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
      <p className="muted account-note">La cuenta de clienta NO da acceso a la agenda privada del salón. Tus reservas anteriores sin cuenta se consultan desde su comprobante.</p>
    </div>
  </div>;
}
