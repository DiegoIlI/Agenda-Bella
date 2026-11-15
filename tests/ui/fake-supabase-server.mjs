// Servidor de PRUEBA que imita lo que la interfaz necesita de Supabase (PostgREST + Auth) ejecutando SQL en
// PostgreSQL REAL con el rol y los permisos RLS verdaderos (anon / authenticated). NO es Supabase.
import http from 'node:http'; import { spawn } from 'node:child_process';
const DB = process.env.TEST_DB || 'ab_e2e'; const PORT = Number(process.env.PORT || 54330); const PASSWORD = 'Test1234!';
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const ident = s => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('identificador inválido ' + s); return s; };
function psql(sql) { return new Promise(res => { const p = spawn('psql', ['-X', '-q', '-At', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-c', sql], { env: { ...process.env, PGOPTIONS: '-c client_min_messages=error' } }); let o = '', e = ''; p.stdout.on('data', d => o += d); p.stderr.on('data', d => e += d); p.on('close', c => res({ code: c, out: o.trim(), err: e.trim() })); }); }
const wrap = (uid, body) => `begin; set local "request.jwt.claim.sub" = ${lit(uid || '')}; set local role ${uid ? 'authenticated' : 'anon'}; ${body}; commit;`;
const parseErr = e => { const m = e.match(/ERROR:\s+(.*)/); return { message: m ? m[1] : e, code: (e.match(/SQLSTATE\s+(\w+)/) || [])[1] }; };
async function run(uid, sql) { const r = await psql(wrap(uid, sql)); if (r.code !== 0) return { error: parseErr(r.err) }; const line = r.out.split('\n').filter(Boolean).pop(); return { data: line === undefined || line === '' ? null : JSON.parse(line) }; }
const retInfo = {};
async function rpcInfo(fn) { if (retInfo[fn]) return retInfo[fn]; const r = await psql(`select proretset::text||'|'||prorettype::regtype::text from pg_proc where proname=${lit(fn)} and pronamespace='public'::regnamespace limit 1`); const [set, type] = r.out.split('|'); return (retInfo[fn] = { set: set === 'true', type }); }
async function handle(path, body, uid) {
  if (path === '/auth/signin') {
    if (body.password !== PASSWORD) return { error: { message: 'Invalid login credentials' } };
    const r = await psql(`select id from auth.users where email=${lit(body.email)}`); if (!r.out) return { error: { message: 'Invalid login credentials' } };
    return { data: { user: { id: r.out, email: body.email }, access_token: r.out } };
  }
  if (path.startsWith('/rpc/')) {
    const fn = ident(path.slice(5)); const info = await rpcInfo(fn); const args = Object.entries(body).map(([k, v]) => `${ident(k)} => ${lit(v)}`).join(', ');
    const call = `public.${fn}(${args})`;
    const q = info.set || info.type === 'record' ? `select coalesce(jsonb_agg(t),'[]'::jsonb) from (select * from ${call}) t` : info.type === 'void' ? `select ${call}; select 'null'` : `select to_jsonb(${call})`;
    return run(uid, q);
  }
  if (path === '/q') {
    const t = ident(body.table); const where = (body.filters || []).map(([c, op, v]) => `${ident(c)} ${{ eq: '=', gte: '>=', lt: '<' }[op]} ${lit(v)}`).join(' and '); const W = where ? ` where ${where}` : '';
    if (body.op === 'select') {
      const ord = body.order ? ` order by ${ident(body.order[0])} ${body.order[1] === 'desc' ? 'desc' : 'asc'}` : ''; const lim = body.limit ? ` limit ${Number(body.limit)}` : '';
      const r = await run(uid, `select coalesce(jsonb_agg(t),'[]'::jsonb) from (select * from public.${t}${W}${ord}${lim}) t`); if (r.error) return r;
      if (body.mode === 'many') return r; if (r.data.length > 1 || (body.mode === 'single' && r.data.length !== 1)) return { error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
      return { data: r.data[0] || null };
    }
    if (body.op === 'update') { const sets = Object.entries(body.values).map(([k, v]) => `${ident(k)} = ${lit(v)}`).join(', '); return run(uid, `with u as (update public.${t} set ${sets}${W} returning *) select coalesce(jsonb_agg(u),'[]'::jsonb) from u`); }
    if (body.op === 'insert') { const rows = Array.isArray(body.values) ? body.values : [body.values]; const cols = Object.keys(rows[0]).map(ident); return run(uid, `with i as (insert into public.${t}(${cols.join(',')}) values ${rows.map(r => `(${cols.map(c => lit(r[c])).join(',')})`).join(',')} returning *) select coalesce(jsonb_agg(i),'[]'::jsonb) from i`); }
    if (body.op === 'delete') return run(uid, `with d as (delete from public.${t}${W} returning *) select coalesce(jsonb_agg(d),'[]'::jsonb) from d`);
  }
  return { error: { message: 'ruta desconocida ' + path } };
}
http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  let raw = ''; req.on('data', d => raw += d);
  req.on('end', async () => { try { const r = await handle(req.url, JSON.parse(raw || '{}'), req.headers['x-uid']); res.writeHead(r.error ? 400 : 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(r)); } catch (e) { res.writeHead(500).end(JSON.stringify({ error: { message: String(e.message) } })); } });
}).listen(PORT, '127.0.0.1', () => console.log('servidor de prueba en', PORT, 'db', DB));
