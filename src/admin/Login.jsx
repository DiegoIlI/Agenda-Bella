import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { api, mode } from '../api/index.js';
import { Brand } from '../components/Brand.jsx';
import { Field, Notice } from '../components/ui.jsx';

export function Login({ onDone, denied }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const choose = t => { setTab(t); setErr(''); setMsg(''); };
  const submit = async e => {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    try {
      if (tab === 'signup') {
        // El registro por sí SOLO crea una identidad normal; no la hace administradora.
        // El servidor valida el código de activación de un solo uso antes de autorizarla.
        const r = await api.registerOwner({ email: email.trim(), password, name });
        if (!r.session) {
          setMsg('Revisa tu correo para confirmar tu cuenta. Luego elige “Activar cuenta” y usa tu código.');
          setTab('activate');
          return;
        }
        await api.redeemOwner(code.trim());
        onDone(r.user);
      } else if (tab === 'activate') {
        const user = await api.signIn(email.trim(), password);
        await api.redeemOwner(code.trim());
        onDone(user);
      } else {
        onDone(await api.signIn(email.trim(), password));
      }
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  return (
    <div className="screen login pad">
      <a className="link back" href="#/"><ArrowLeft size={16} />Volver a reservar</a>
      <div className="login-brand"><Brand /></div>
      <form onSubmit={submit} className="login-card">
        <h1><Lock size={22} />Acceso del salón</h1>
        <p className="muted">Exclusivo para la estilista autorizada. Las clientas pueden reservar sin cuenta desde la pantalla principal.</p>
        <div className="auth-switch" role="group" aria-label="Cuenta administradora">
          <button type="button" className={tab === 'login' ? 'on' : ''} onClick={() => choose('login')}>Entrar</button>
          <button type="button" className={tab === 'signup' ? 'on' : ''} onClick={() => choose('signup')}>Crear cuenta</button>
          <button type="button" className={tab === 'activate' ? 'on' : ''} onClick={() => choose('activate')}>Activar cuenta</button>
        </div>
        {denied && <Notice tone="error">Esta cuenta no tiene permisos administrativos. Si eres la primera dueña, utiliza “Activar cuenta” con tu código privado.</Notice>}
        {tab === 'signup' && <Field label="Nombre de la estilista"><input required minLength={2} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></Field>}
        <Field label="Correo"><input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><input type="password" minLength={8} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} /></Field>
        {tab !== 'login' && <Field label="Código privado de activación" hint="Este código se genera en Supabase una sola vez. No se incluye dentro de la app."><input type="text" autoCapitalize="characters" autoComplete="off" required maxLength={64} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Código entregado a la estilista" /></Field>}
        {err && <Notice tone="error">{err}</Notice>}
        {msg && <Notice tone="ok">{msg}</Notice>}
        <button className="btn primary block" disabled={busy || mode !== 'live'}>{busy ? 'Procesando…' : tab === 'login' ? 'Entrar' : tab === 'signup' ? 'Crear cuenta de estilista' : 'Activar acceso administrativo'}</button>
        <p className="muted account-note">Por seguridad, el registro de administradora requiere un código temporal de un solo uso. Nadie puede hacerse administrador solo por instalar la IPA.</p>
      </form>
    </div>
  );
}
