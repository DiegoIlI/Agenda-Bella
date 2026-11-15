import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { api } from '../api/index.js';
import { Brand } from '../components/Brand.jsx';
import { Field, Notice } from '../components/ui.jsx';

export function Login({ onDone, denied }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { onDone(await api.signIn(email.trim(), password)); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <div className="screen login pad">
      <a className="link back" href="#/"><ArrowLeft size={16} />Volver a reservar</a>
      <div className="login-brand"><Brand /></div>
      <form onSubmit={submit} className="login-card">
        <h1><Lock size={22} />Acceso del salón</h1>
        <p className="muted">Solo la dueña y su personal autorizado pueden entrar.</p>
        {denied && <Notice tone="error">Esta cuenta no tiene permiso para administrar el salón.</Notice>}
        <Field label="Correo"><input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></Field>
        {err && <Notice tone="error">{err}</Notice>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
