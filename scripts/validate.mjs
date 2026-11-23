// Revisa que el proyecto esté completo y sin secretos antes de compilar o generar la IPA.
import fs from 'node:fs';
import path from 'node:path';
const need = [
  'src/main.jsx', 'src/App.jsx', 'src/config.js', 'src/api/index.js', 'src/api/live.js', 'src/api/demo.js', 'src/notifications.js', 'src/styles/tokens.css',
  'src/client/ClientBooking.jsx', 'src/client/Receipt.jsx', 'src/admin/AdminApp.jsx', 'src/styles/app.css',
  'public/manifest.webmanifest', 'public/sw.js', 'public/_headers',
  'supabase/migrations/001_agenda_bella.sql', 'supabase/migrations/003_agenda_bella_v3.sql', 'supabase/setup_completo.sql',
  'supabase/functions/appointment-reminders/index.ts', 'supabase/functions/appointment-reminders/lib.js',
  '.github/workflows/ios-ipa.yml', '.github/workflows/ci.yml', 'capacitor.config.json', 'package.json',
];
let bad = 0; const fail = m => { console.error('✗', m); bad++; };
for (const f of need) fs.existsSync(f) ? console.log('OK', f) : fail(`Falta: ${f}`);
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
if (manifest.display !== 'standalone') fail('Falta display:standalone en la PWA');
const sql = fs.readFileSync('supabase/migrations/001_agenda_bella.sql', 'utf8');
if (!sql.includes('bookings_no_overlap')) fail('Falta la restricción anti-empalmes en Supabase');
// Ningún secreto en el código que viaja al navegador.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const pats = [/service_role/i, /WA_ACCESS_TOKEN/, /VAPID_PRIVATE/, /EAA[A-Za-z0-9]{40,}/, /sb_secret_/, /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/];
for (const f of [...walk('src'), ...walk('public'), 'index.html']) {
  const t = fs.readFileSync(f, 'utf8');
  for (const p of pats) if (p.test(t)) fail(`Posible secreto en ${f} (${p})`);
}
// Bella Design System: colores, tamaños de letra, radios y sombras solo como tokens (src/styles/tokens.css).
const literal = [
  [/#[0-9a-f]{3,8}\b/i, 'color hexadecimal'], [/\brgba?\(/i, 'color rgb()'], [/\bhsla?\(/i, 'color hsl()'],
  [/font-size:\s*[\d.]+(px|rem|em)/i, 'tamaño de letra'], [/\bfont:[^;]*\b[\d.]+(px|rem)/i, 'tamaño de letra'],
  [/border-radius:\s*(?!50%)[^;]*\d+px/i, 'radio'], [/box-shadow:\s*(?!none)[^;]*\d+px/i, 'sombra'],
];
for (const f of walk('src').filter(f => /\.(css|jsx?)$/.test(f) && !f.endsWith('tokens.css'))) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
    // En CSS se revisa todo; en JS/JSX, solo los colores escritos en estilos en línea o atributos SVG.
    const checks = f.endsWith('.css') ? literal : /style=|fill=|stroke=|color:/.test(code) ? literal.slice(0, 3) : [];
    for (const [re, what] of checks) if (re.test(code)) fail(`${f}:${i + 1} ${what} escrito a mano; usa un token de src/styles/tokens.css`);
  });
}
if (fs.existsSync('.env')) console.log('Aviso: existe .env local (está en .gitignore; no lo subas).');
if (bad) { console.error(`\n${bad} problema(s).`); process.exit(1); }
console.log('\nValidación correcta.');
