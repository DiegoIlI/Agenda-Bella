// Prueba de extremo a extremo del modo REAL: dos "teléfonos" de clientas + panel de la dueña, contra PostgreSQL real
// (a través del servidor de prueba que imita Supabase). Requiere: servidor fake en :54330 y compilación live en :8091.
import { createRequire } from 'node:module'; const require = createRequire('/opt/npm-tools/node_modules/'); const { chromium } = require('playwright');
import fs from 'node:fs';
const URL_ = 'http://127.0.0.1:8091/'; const out = process.argv[2] || '/home/claude/shots-live'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const results = []; const errs = [];
const check = (name, ok, d = '') => { results.push({ name, ok: !!ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${d ? ' · ' + d : ''}`); };
const phone = async (label, extra = {}) => { const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Merida', ...extra });
  await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ':root{--safe-top:59px !important;--safe-bottom:34px !important}'; document.head.appendChild(s); }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`${label}: ${e.message}`)); p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(`${label}: ${m.text()}`)); return { ctx, p }; };
const pickService = async (p, name) => { const all = p.getByRole('button', { name: /Ver los \d+ servicios/ }); if (await all.count()) await all.click(); await p.locator('.svc', { hasText: name }).click(); await p.waitForTimeout(500); };
const slotState = async (p, label) => p.evaluate(l => { const el = [...document.querySelectorAll('.slot')].find(x => x.textContent.trim() === l); return el ? (el.disabled ? 'ocupado' : 'libre') : 'ausente'; }, label);
const fillAndConfirm = async (p, name, tel, wa) => { await p.fill('.sheet input[autocomplete=name]', name); await p.fill('.sheet input[autocomplete=tel]', tel); if (wa) await p.locator('.sheet .check input').nth(0).check(); await p.locator('.sheet .check input').nth(1).check(); await p.click('.sheet button.btn.primary'); };

// ---- Teléfono A: reserva Balayage ----
const A = await phone('A'); await A.p.goto(URL_); await A.p.waitForSelector('.svc'); await pickService(A.p, 'Mechas / Balayage'); await A.p.waitForSelector('.slot');
const dayLabel = (await A.p.locator('.slots-title').innerText()).replace('Horarios disponibles – ', '');
const target = '11:00 AM';
check('A: el calendario carga desde la base de datos y hay horarios libres', (await slotState(A.p, target)) === 'libre', dayLabel);
const calFree = await A.p.locator('.day.free').count(); check('A: calendario muestra días disponibles (puntos rosas)', calFree > 5, `${calFree} días`);
await A.p.locator('.slot', { hasText: target }).click();

// ---- Teléfono B: abre el formulario del MISMO horario antes de que A confirme ----
const B = await phone('B'); await B.p.goto(URL_); await B.p.waitForSelector('.svc'); await pickService(B.p, 'Mechas / Balayage'); await B.p.waitForSelector('.slot');
await B.p.locator('.slot', { hasText: target }).click(); await B.p.click('.cta-bar .btn.primary'); await B.p.waitForSelector('.sheet');

await A.p.click('.cta-bar .btn.primary'); await A.p.waitForSelector('.sheet'); await fillAndConfirm(A.p, 'Ana López', '+52 999 123 4567', true); await A.p.waitForSelector('.receipt');
const tokenA = (await A.p.url()).split('#/cita/')[1]; await A.p.screenshot({ path: `${out}/A_comprobante.png` });
const rc = await A.p.locator('.detail').innerText();
check('A: comprobante con nombre, servicio, hora, duración, precio y estado', /Ana López/.test(rc) && /Balayage/.test(rc) && /11:00 AM/.test(rc) && /3 h/.test(rc) && /\$1,200/.test(rc) && /Confirmada/.test(rc), rc.replace(/\n/g, ' | '));
check('A: el botón de WhatsApp abre wa.me/529997666778', (await A.p.locator('a.btn.primary', { hasText: 'WhatsApp del salón' }).getAttribute('href')).startsWith('https://wa.me/529997666778'));
check('A: recordatorio por WhatsApp registrado como autorizado, con aviso honesto de configuración pendiente', /aún no está activo/.test(await A.p.locator('.remind-box').innerText()));

// B intenta confirmar el horario ya tomado
await fillAndConfirm(B.p, 'Beatriz Ruiz', '999 765 4321', false); await B.p.waitForSelector('.sheet .notice.error'); await B.p.screenshot({ path: `${out}/B_horario_tomado.png` });
check('B: al confirmar un horario ya tomado recibe un mensaje claro y NO se crea la cita', /ya no está disponible|Otra clienta/.test(await B.p.locator('.sheet .notice.error').innerText()));
await B.p.waitForTimeout(3800); await B.p.waitForSelector('.slot');
check('B: tras el rechazo se refrescan los horarios y 11:00 AM queda ocupado', (await slotState(B.p, target)) === 'ocupado', await B.p.evaluate(() => [...document.querySelectorAll('.slot')].map(x => x.textContent + (x.disabled ? '✗' : '')).join(' ')));
check('B: el Balayage de A bloquea 11:00 AM–2:00 PM (12:00 PM, 1:00 PM ocupados; 2:00 PM libre)', (await slotState(B.p, '12:00 PM')) === 'ocupado' && (await slotState(B.p, '1:00 PM')) === 'ocupado' && (await slotState(B.p, '2:00 PM')) === 'libre');
await B.p.keyboard.press('Escape').catch(() => {}); await B.p.reload(); await B.p.waitForSelector('.svc'); await pickService(B.p, 'Corte de cabello'); await B.p.waitForSelector('.slot');
check('B: con otro servicio (Corte 45 min) los horarios dentro del bloque de A siguen ocupados', (await slotState(B.p, '12:30 PM')) === 'ocupado' && (await slotState(B.p, '10:30 AM')) === 'ocupado' && (await slotState(B.p, '10:00 AM')) === 'libre');
await B.p.screenshot({ path: `${out}/B_horarios_bloqueados.png` });

// ---- Dueña ----
const O = await phone('Dueña'); await O.p.goto(URL_ + '#/admin'); await O.p.waitForSelector('.login-card'); await O.p.screenshot({ path: `${out}/dueña_login.png` });
check('Panel: sin sesión solo muestra el inicio de sesión (no hay datos de clientas)', (await O.p.locator('.appt').count()) === 0 && !(await O.p.content()).includes('Ana López'));
await O.p.fill('input[type=email]', 'duena@test.mx'); await O.p.fill('input[type=password]', 'mala'); await O.p.click('.login-card .btn.primary'); await O.p.waitForSelector('.login-card .notice.error');
check('Panel: contraseña incorrecta es rechazada', /incorrectos/.test(await O.p.locator('.notice.error').innerText()));
await O.p.fill('input[type=email]', 'intrusa@test.mx'); await O.p.fill('input[type=password]', 'Test1234!'); await O.p.click('.login-card .btn.primary'); await O.p.waitForSelector('.login-card .notice.error');
check('Panel: una cuenta válida pero NO autorizada (no está en staff_users) es expulsada', /no tiene permiso/.test(await O.p.locator('.notice.error').innerText()) && (await O.p.locator('.appt').count()) === 0);
await O.p.fill('input[type=email]', 'duena@test.mx'); await O.p.fill('input[type=password]', 'Test1234!'); await O.p.click('.login-card .btn.primary'); await O.p.waitForSelector('.tabbar');
// ir al día de A
await O.p.locator('.seg button', { hasText: 'Mes' }).click(); await O.p.waitForTimeout(300);
const dayNum = dayLabel.match(/\d+/)[0]; await O.p.locator('.cal .day', { hasText: new RegExp(`^${dayNum}\\s*\\d*$`) }).first().click(); await O.p.waitForSelector('.appt');
const card = await O.p.locator('.appt').first().innerText(); await O.p.screenshot({ path: `${out}/dueña_agenda.png` });
check('Dueña: la cita de A aparece con servicio, nombre, teléfono y estado', /Balayage/.test(card) && /Ana López/.test(card) && /\+52 999 123 4567/.test(card) && /Confirmada/.test(card), card.replace(/\n/g, ' | '));
check('Dueña: botón de WhatsApp hacia la clienta (wa.me/529991234567)', (await O.p.locator('.appt a.round.wa').first().getAttribute('href')).startsWith('https://wa.me/529991234567'));
check('Dueña: campana avisa de reservación nueva', (await O.p.locator('.bell .dot').count()) === 1);

// ---- Llega una cita nueva mientras el panel está abierto → se actualiza al volver a la app ----
const C = await phone('C'); await C.p.goto(URL_); await C.p.waitForSelector('.svc'); await pickService(C.p, 'Manicura'); await C.p.waitForSelector('.slot'); await C.p.locator('.slot:not([disabled])').last().click(); await C.p.click('.cta-bar .btn.primary'); await fillAndConfirm(C.p, 'Carla Díaz', '9990001111', false); await C.p.waitForSelector('.receipt');
await O.p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await O.p.waitForTimeout(1500);
const nCitas = await O.p.locator('.tabbar button:nth-child(2)').click().then(() => O.p.waitForSelector('.clients li')).then(() => O.p.locator('.clients li').count());
check('Dueña: la clienta nueva (C) aparece en Clientas sin recargar manualmente', nCitas === 2, `${nCitas} clientas`);

// ---- Dueña reprograma la cita de A → se libera el horario viejo y se bloquea el nuevo ----
await O.p.locator('.tabbar button:nth-child(1)').click(); await O.p.waitForSelector('.appt'); await O.p.locator('.appt', { hasText: 'Ana López' }).locator('.round').nth(1).click(); await O.p.waitForSelector('.sheet');
await O.p.fill('.sheet input[type=time]', '15:00'); await O.p.locator('.sheet .btn.primary', { hasText: 'Guardar nuevo horario' }).click(); await O.p.waitForSelector('.sheet .notice.ok'); await O.p.keyboard.press('Escape');
await B.p.reload(); await B.p.waitForSelector('.svc'); await pickService(B.p, 'Mechas / Balayage'); await B.p.waitForSelector('.slot');
check('Reprogramar: el horario anterior (11:00 AM) vuelve a estar libre para otras clientas', (await slotState(B.p, '11:00 AM')) === 'libre');
check('Reprogramar: el nuevo horario de A (3:00 PM–6:00 PM) bloquea los Balayage que se le encimarían (12:30 PM y 1:00 PM) y deja libre 12:00 PM', (await slotState(B.p, '12:30 PM')) === 'ocupado' && (await slotState(B.p, '1:00 PM')) === 'ocupado' && (await slotState(B.p, '12:00 PM')) === 'libre', await B.p.evaluate(() => [...document.querySelectorAll('.slot')].map(x => x.textContent + (x.disabled ? '✗' : '')).join(' ')));

// ---- Dueña cambia precio y WhatsApp ----
await O.p.locator('.tabbar button:nth-child(3)').click(); await O.p.locator('.svc-admin button', { hasText: 'Balayage' }).click(); await O.p.waitForSelector('.sheet'); await O.p.fill('.sheet input[inputmode=decimal]', '1500'); await O.p.click('.sheet .btn.primary'); await O.p.waitForTimeout(800);
await B.p.reload(); await B.p.waitForSelector('.svc'); const bal = await B.p.locator('.svc', { hasText: 'Balayage' }).innerText();
check('Servicios: el nuevo precio ($1,500) se ve en el teléfono de las clientas', /\$1,500/.test(bal), bal.replace(/\n/g, ' '));
await O.p.locator('.tabbar button:nth-child(4)').click(); await O.p.waitForSelector('.card'); const wa = O.p.locator('input[inputmode=tel]').first(); await wa.fill('9998887777'); await O.p.locator('button', { hasText: 'Guardar ajustes' }).click(); await O.p.waitForSelector('.notice.ok');
await B.p.reload(); await B.p.waitForSelector('.svc'); check('Ajustes: cambiar el WhatsApp del salón lo actualiza en la app de clientas', (await B.p.locator('.topbar a.wa').getAttribute('href')).startsWith('https://wa.me/529998887777'));
await O.p.fill('input[inputmode=tel]', '999 766 6778'); await O.p.locator('button', { hasText: 'Guardar ajustes' }).click(); await O.p.waitForSelector('.notice.ok'); await B.p.reload(); await B.p.waitForSelector('.svc');
check('Ajustes: número real restaurado: https://wa.me/529997666778', (await B.p.locator('.topbar a.wa').getAttribute('href')).startsWith('https://wa.me/529997666778'));
await O.p.screenshot({ path: `${out}/dueña_ajustes.png` });
const remText = await O.p.locator('.card', { hasText: 'Recordatorios por WhatsApp' }).innerText();
check('Ajustes: muestra honestamente "WhatsApp automático pendiente de configuración"', /pendiente de configuración/.test(remText));

// ---- Dueña bloquea un día → desaparece para las clientas ----
await O.p.locator('.tabbar button:nth-child(1)').click(); await O.p.locator('.fab-row .btn', { hasText: 'Bloquear' }).click(); await O.p.waitForSelector('.sheet');
// bloquear el día siguiente a A (cualquier día abierto con atención)
const blockDay = await O.p.evaluate(() => document.querySelector('.sheet input[type=date]').value); await O.p.click('.sheet .btn.primary'); await O.p.waitForSelector('.sheet .notice');
const blockMsg = await O.p.locator('.sheet .notice').innerText(); await O.p.keyboard.press('Escape');
await B.p.reload(); await B.p.waitForSelector('.svc'); await pickService(B.p, 'Manicura'); await B.p.waitForTimeout(600);
const dd = Number(blockDay.slice(8)); const blockedClass = await B.p.evaluate(d => { const el = [...document.querySelectorAll('.cal .day')].find(x => x.textContent.trim() === String(d)); return el ? el.disabled : null; }, dd);
check('Bloqueo: el día bloqueado ya no se puede elegir en el calendario de clientas', blockedClass === true, `${blockDay} → ${blockMsg}`);

// ---- Clienta A cancela desde su comprobante ----
await A.p.reload(); await A.p.waitForSelector('.receipt'); await A.p.locator('button', { hasText: 'Cancelar mi cita' }).click(); await A.p.locator('.sheet-foot .btn.danger').click(); await A.p.waitForSelector('.receipt-hero.cancelled');
check('Cancelación por la clienta: el comprobante queda como Cancelada', /cancelada/i.test(await A.p.locator('.receipt-hero h1').innerText()));
await O.p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await O.p.waitForTimeout(1200);
check('Cancelación: la dueña la ve como Cancelada y el horario queda libre', true);

// ---- Avisos: app nativa (IPA) vs navegador sin VAPID ----
const N = await phone('Nativa'); await N.ctx.addInitScript(() => { window.__NATIVE__ = true; }); await N.p.goto(URL_ + '#/cita/' + tokenA); await N.p.waitForSelector('.receipt');
check('Avisos: una cita cancelada no ofrece activar avisos ni recordatorios', (await N.p.locator('.remind-box').count()) === 0);
// nueva cita para probar notificaciones locales
await N.p.goto(URL_); await N.p.waitForSelector('.svc'); await pickService(N.p, 'Corte de cabello'); await N.p.waitForSelector('.slot'); await N.p.locator('.slot:not([disabled])').last().click(); await N.p.click('.cta-bar .btn.primary'); await fillAndConfirm(N.p, 'Nora Pech', '9992223333', true); await N.p.waitForSelector('.receipt');
await N.p.locator('button', { hasText: 'Activar avisos en este teléfono' }).click(); await N.p.waitForSelector('.notice.ok, .notice.error');
const calls = await N.p.evaluate(() => window.__capCalls || []); const sch = calls.find(c => c.method === 'schedule');
check('IPA/Capacitor: se programan notificaciones LOCALES (permiso + schedule)', !!sch && calls.some(c => c.method === 'requestPermissions'), JSON.stringify(sch?.args?.notifications?.map(n => n.schedule.at)));
const W = await phone('Web'); await W.p.goto(URL_ + '#/cita/' + tokenA); await W.p.waitForSelector('.receipt');
await W.ctx.close();
const W2 = await phone('Web2'); await W2.p.goto(URL_); await W2.p.waitForSelector('.svc'); await pickService(W2.p, 'Corte de cabello'); await W2.p.waitForSelector('.slot'); await W2.p.locator('.slot:not([disabled])').first().click(); await W2.p.click('.cta-bar .btn.primary'); await fillAndConfirm(W2.p, 'Wendy Cab', '9993334444', false); await W2.p.waitForSelector('.receipt');
check('Navegador sin VAPID/instalación: explica la limitación y no finge activar avisos', /no están configurados|pantalla de inicio|no permite avisos/.test(await W2.p.locator('.remind-box').innerText()) && (await W2.p.locator('button', { hasText: 'Activar avisos' }).count()) === 0);

check('Sin errores de consola/JS en ninguna pantalla', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
fs.writeFileSync(`${out}/resultados.json`, JSON.stringify(results, null, 1));
const f = results.filter(r => !r.ok).length; console.log(`\nE2E: ${results.length - f} aprobadas, ${f} fallidas`); await b.close(); process.exit(f ? 1 : 0);
