// Compilación de PRUEBA con esbuild (Vite no se pudo instalar sin internet en el entorno de pruebas).
// Sustituye lucide-react por los mismos iconos de react-icons/lu, y @supabase/supabase-js y @capacitor/core
// por simuladores de prueba. Uso: node build.mjs <demo|live> <outDir>
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '../..');
const [kind = 'demo', out = path.join(root, 'dist-test')] = process.argv.slice(2);
const ALIAS = { CheckCircle2: 'CircleCheck', AlertTriangle: 'TriangleAlert', XCircle: 'CircleX' };
const used = new Set();
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.jsx?$/.test(f)) { const s = fs.readFileSync(p, 'utf8'); for (const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g)) m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach(n => used.add(n)); } } })(path.join(root, 'src'));
const lu = await import('/opt/npm-tools/node_modules/react-icons/lu/index.mjs');
const shim = [...used].map(n => { const k = `Lu${ALIAS[n] || n}`; if (!lu[k]) throw new Error('Falta icono ' + n); return `export const ${n} = (p) => { const {size=24, strokeWidth, ...r} = p; return lu.${k}({ size, strokeWidth, ...r }); };`; });
const luShim = `import * as lu from '/opt/npm-tools/node_modules/react-icons/lu/index.mjs';\n${shim.join('\n')}`;
const plugin = { name: 'shims', setup(b) {
  b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'shim' }));
  b.onLoad({ filter: /^lucide$/, namespace: 'shim' }, () => ({ contents: luShim, loader: 'js', resolveDir: '/opt/npm-tools/node_modules' }));
  b.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: path.join(here, 'shims/capacitor-core.js') }));
  if (kind === 'live') b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: path.join(here, 'shims/supabase-js.js') }));
  else b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: path.join(here, 'shims/empty.js') }));
} };
const env = kind === 'live' ? { VITE_SUPABASE_URL: 'http://127.0.0.1:54330', VITE_SUPABASE_ANON_KEY: 'test-anon-key', VITE_DEMO_MODE: '', VITE_PUBLIC_BOOKING_URL: 'https://reservas.ejemplo.mx/', VITE_VAPID_PUBLIC_KEY: '' }
  : kind === 'demo' ? { VITE_DEMO_MODE: 'true' } : { };
const define = { 'import.meta.env.PROD': 'true', 'import.meta.env.MODE': '"test"' };
for (const k of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_DEMO_MODE', 'VITE_PUBLIC_BOOKING_URL', 'VITE_VAPID_PUBLIC_KEY']) define[`import.meta.env.${k}`] = JSON.stringify(env[k] ?? '');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
await build({ entryPoints: [path.join(root, 'src/main.jsx')], bundle: true, outdir: out, entryNames: 'app', jsx: 'automatic', format: 'esm', minify: false, sourcemap: false,
  loader: { '.jpg': 'dataurl', '.png': 'dataurl' }, plugins: [plugin], define, nodePaths: ['/opt/npm-tools/node_modules'], logLevel: 'warning', absWorkingDir: root });
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<script type="module" src="/src/main.jsx"></script>', '<link rel="stylesheet" href="./app.css"><script type="module" src="./app.js"></script>');
html = html.replace(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>\n?/g, '');
fs.writeFileSync(path.join(out, 'index.html'), html);
for (const f of fs.readdirSync(path.join(root, 'public'))) fs.copyFileSync(path.join(root, 'public', f), path.join(out, f));
console.log(`build ${kind} OK → ${out} (${(fs.statSync(path.join(out, 'app.js')).size / 1024).toFixed(0)} KB js)`);
