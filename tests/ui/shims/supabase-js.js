// Cliente SIMULADO de supabase-js para pruebas: reenvía cada operación a un servidor local que ejecuta SQL
// sobre PostgreSQL REAL con el rol (anon/authenticated) y los permisos RLS reales. No es supabase-js real.
const BASE = 'http://127.0.0.1:54330';
const SK = 'fake-sb-session';
const getSession = () => { try { return JSON.parse(localStorage.getItem(SK)); } catch { return null; } };
async function call(path, body) {
  const s = getSession();
  let res;
  try { res = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-uid': s?.user?.id || '' }, body: JSON.stringify(body) }); }
  catch { return { data: null, error: { message: 'Failed to fetch' } }; }
  const j = await res.json(); return res.ok ? { data: j.data, error: null } : { data: null, error: j.error };
}
class Q {
  constructor(table) { this.q = { table, op: 'select', cols: '*', filters: [], order: null, limit: null, mode: 'many' }; }
  select(c = '*') { if (this.q.op === 'select') this.q.cols = c; return this; }
  insert(v) { this.q.op = 'insert'; this.q.values = v; return this; }
  update(v) { this.q.op = 'update'; this.q.values = v; return this; }
  delete() { this.q.op = 'delete'; return this; }
  eq(c, v) { this.q.filters.push([c, 'eq', v]); return this; }
  gte(c, v) { this.q.filters.push([c, 'gte', v]); return this; }
  lt(c, v) { this.q.filters.push([c, 'lt', v]); return this; }
  order(c, o = {}) { this.q.order = [c, o.ascending === false ? 'desc' : 'asc']; return this; }
  limit(n) { this.q.limit = n; return this; }
  single() { this.q.mode = 'single'; return this; }
  maybeSingle() { this.q.mode = 'maybe'; return this; }
  then(res, rej) { return call('/q', this.q).then(res, rej); }
}
export function createClient() {
  return {
    from: t => new Q(t),
    rpc: (fn, args) => call('/rpc/' + fn, args || {}),
    auth: {
      async getSession() { const s = getSession(); return { data: { session: s } }; },
      async signInWithPassword({ email, password }) { const r = await call('/auth/signin', { email, password }); if (r.error) return { data: null, error: r.error }; localStorage.setItem(SK, JSON.stringify(r.data)); return { data: r.data, error: null }; },
      async signOut() { localStorage.removeItem(SK); return { error: null }; },
    },
    channel() { const c = { on: () => c, subscribe: () => c }; return c; },
    removeChannel() {},
  };
}
