// Capturas de la UI emulando un iPhone con isla dinámica (zona segura 59px arriba y 34px abajo) + verificación de solapamientos.
import { createRequire } from 'node:module'; const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
import fs from 'node:fs';
const out = process.argv[2] || '/home/claude/shots'; const url = process.argv[3] || 'http://127.0.0.1:8090/'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Merida' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ':root{--safe-top:59px !important;--safe-bottom:34px !important}'; document.head.appendChild(s); }); });
const shot = async n => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${n}.png` }); };
const results = [];
const check = (name, ok, d = '') => { results.push({ name, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${d}`); };

await p.goto(url); await p.waitForSelector('.svc'); await p.waitForSelector('.slot');
// zona segura: la barra superior empieza por debajo de 59px y nada visible queda encima
const top = await p.evaluate(() => { const r = document.querySelector('.topbar').getBoundingClientRect(); const logo = document.querySelector('.brand').getBoundingClientRect(); return { barTop: r.top, logoTop: logo.top }; });
check('cliente: el logo queda debajo de la zona segura (≥59px)', top.logoTop >= 59, JSON.stringify(top));
await shot('01_cliente_inicio');
await p.click('.svc:nth-child(1)', { force: true }).catch(() => {});
await p.evaluate(() => window.scrollTo(0, 560)); await shot('02_cliente_calendario_horarios');
await p.evaluate(() => window.scrollTo(0, 0)); await p.click('.topbar .icon-btn:first-child'); await p.waitForTimeout(400);
const side = await p.evaluate(() => { const h = document.querySelector('.side-head').getBoundingClientRect(); return h.top; });
check('menú lateral: encabezado debajo de la zona segura (≥59px)', side >= 59, `top=${side}`); await shot('03_cliente_menu'); await p.keyboard.press('Escape'); await p.click('.side-back', { force: true }).catch(() => {});
await p.waitForTimeout(300);
// reservar
await p.evaluate(() => window.scrollTo(0, 560)); await p.click('.slot:not([disabled]) >> nth=2'); await p.click('.cta-bar .btn.primary'); await p.waitForSelector('.sheet'); await shot('04_cliente_confirmar');
await p.click('.sheet button.btn.primary'); await p.waitForTimeout(200);
check('validación: pide nombre, teléfono y aviso de privacidad', (await p.locator('.sheet .err').count()) >= 3);
await p.fill('.sheet input[autocomplete=name]', 'Prueba Visual'); await p.fill('.sheet input[autocomplete=tel]', '999 123 4567');
await p.locator('.sheet .check input').nth(1).check(); await p.click('.sheet button.btn.primary'); await p.waitForSelector('.receipt'); await shot('05_cliente_comprobante');
check('comprobante muestra confirmada', (await p.locator('.receipt-hero h1').innerText()).includes('confirmada'));
await p.goto(url + '#/admin'); await p.waitForSelector('.appt'); await shot('06_admin_dia');
const nav = await p.evaluate(() => { const r = document.querySelector('.tabbar').getBoundingClientRect(); return { bottom: window.innerHeight - r.bottom, h: r.height }; });
check('barra inferior alineada al fondo con zona segura', nav.bottom === 0 && nav.h >= 34 + 50, JSON.stringify(nav));
await p.click('.seg button:nth-child(2)'); await shot('07_admin_semana'); await p.click('.seg button:nth-child(3)'); await shot('08_admin_mes'); await p.click('.seg button:nth-child(1)');
await p.click('.appt .round:nth-child(2) >> nth=0'); await p.waitForSelector('.sheet'); await shot('09_admin_editar'); await p.keyboard.press('Escape');
await p.click('.tabbar button:nth-child(2)'); await shot('10_admin_clientas'); await p.click('.clients button >> nth=0'); await shot('11_admin_clienta_detalle'); await p.keyboard.press('Escape');
await p.click('.tabbar button:nth-child(3)'); await shot('12_admin_servicios'); await p.click('.svc-admin button >> nth=0'); await shot('13_admin_servicio_editar'); await p.keyboard.press('Escape');
await p.click('.tabbar button:nth-child(4)'); await shot('14_admin_ajustes'); await p.evaluate(() => window.scrollTo(0, 1500)); await shot('15_admin_ajustes_horarios'); await p.evaluate(() => window.scrollTo(0, 99999)); await shot('16_admin_ajustes_fin');
const overflowX = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('sin desbordamiento horizontal', overflowX <= 0, `dx=${overflowX}`);
check('sin errores de consola', errs.length === 0, JSON.stringify(errs));
fs.writeFileSync(`${out}/resultados.json`, JSON.stringify(results, null, 1)); await b.close();
