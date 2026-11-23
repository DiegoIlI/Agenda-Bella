// Recorrido completo de Agenda Bella en modo demostración, en móvil y escritorio.
// Red de seguridad para el rediseño: si una fase rompe una reserva o una acción del panel, esta prueba falla.
//
// Uso:  npm run build:demo && npx vite preview --port 4173 --strictPort &   y luego   npm run test:e2e
// Variables opcionales: E2E_URL (por defecto http://localhost:4173/), E2E_OUT (carpeta de capturas),
// E2E_CHROMIUM (ruta a un Chromium ya instalado).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = (process.env.E2E_URL || 'http://localhost:4173/').replace(/\/?$/, '/');
const OUT = process.env.E2E_OUT || 'tests/e2e/capturas';
const VIEWPORTS = [
  { name: 'movil', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'escritorio', viewport: { width: 1440, height: 900 } },
];
// Controles principales que deben medir al menos 44×44 px (Apple HIG / skill ui-ux-pro-max §2).
const TARGETS_44 = ['.icon-btn', '.btn', '.slot', '.svc', '.seg button', '.tabbar button', '.round', '.date-pill'];

const results = []; let failed = 0;
const ok = (vp, name, detail = '') => { results.push(`  ✓ [${vp}] ${name}${detail ? ` · ${detail}` : ''}`); };
const fail = (vp, name, err) => { failed++; results.push(`  ✗ [${vp}] ${name}\n      ${String(err?.message || err).split('\n')[0]}`); };

async function step(vp, name, fn) {
  try { const d = await fn(); ok(vp, name, d); return true; } catch (e) { fail(vp, name, e); return false; }
}

async function checkLayout(p, vp, screen) {
  const r = await p.evaluate(sel => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const small = [];
    for (const s of sel) for (const el of document.querySelectorAll(s)) {
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (!b.width || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue;
      if (b.width < 43.5 || b.height < 43.5) small.push(`${s} ${Math.round(b.width)}×${Math.round(b.height)}`);
    }
    return { overflow, small: [...new Set(small)] };
  }, TARGETS_44);
  if (r.overflow > 1) throw new Error(`${screen}: desplazamiento horizontal de ${r.overflow}px`);
  if (process.env.E2E_STRICT_TARGETS === '1' && r.small.length) throw new Error(`${screen}: objetivos táctiles < 44px: ${r.small.join(', ')}`);
  return r.small.length ? `objetivos < 44px: ${r.small.join(', ')}` : '';
}

async function run({ name: vp, ...ctxOpts }) {
  const browser = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
  const ctx = await browser.newContext({ ...ctxOpts, locale: 'es-MX', timezoneId: 'America/Merida', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const shot = n => p.screenshot({ path: `${OUT}/${vp}-${n}.png`, fullPage: true });
  const dlg = n => p.getByRole('dialog', { name: n });

  // ---------- Clienta ----------
  await step(vp, 'clienta: carga servicios y calendario', async () => {
    await p.goto(BASE); await p.getByRole('list', { name: 'Servicios' }).getByRole('button').first().waitFor();
    await p.locator('section[aria-label="Calendario"][aria-busy="false"]').waitFor();
    await shot('01-clienta-inicio'); return checkLayout(p, vp, 'inicio');
  });
  await step(vp, 'clienta: menú lateral abre y se cierra con Escape', async () => {
    await p.getByRole('button', { name: 'Abrir menú' }).click();
    const menu = p.locator('.side-wrap.open'); await menu.waitFor(); await shot('02-clienta-menu');
    await p.keyboard.press('Escape'); await p.locator('.side-wrap:not(.open)').waitFor({ state: 'attached' });
  });
  let picked = null;
  await step(vp, 'clienta: elige servicio, día libre y horario', async () => {
    const svc = p.getByRole('list', { name: 'Servicios' }).getByRole('button').first();
    await svc.click(); if (await svc.getAttribute('aria-pressed') !== 'true') throw new Error('el servicio no quedó seleccionado');
    await p.locator('section[aria-label="Calendario"][aria-busy="false"]').waitFor();
    // El último día libre visible: lejos de la hora actual, así la cancelación siempre está permitida.
    const days = p.getByRole('button', { name: /, disponible/ });
    if (!(await days.count())) { await p.getByRole('button', { name: 'Mes siguiente' }).click(); await p.locator('section[aria-label="Calendario"][aria-busy="false"]').waitFor(); }
    await days.last().click();
    const slot = p.getByRole('group', { name: 'Horarios' }).locator('button:not([disabled])').first();
    await slot.waitFor(); await slot.click();
    if (await slot.getAttribute('aria-pressed') !== 'true') throw new Error('el horario no quedó seleccionado');
    picked = await slot.textContent(); await shot('03-clienta-seleccion'); return `horario ${picked}`;
  });
  await step(vp, 'clienta: el formulario valida y la reserva se confirma', async () => {
    await p.locator('.cta-bar').getByRole('button', { name: /Reservar cita/ }).click();
    const d = dlg('Confirma tu reservación'); await d.waitFor();
    await d.getByRole('button', { name: 'Confirmar reservación' }).click();
    await d.getByText('Escribe tu nombre completo.').waitFor(); await shot('04-clienta-validacion');
    await d.getByLabel('Nombre completo').fill('Prueba Automática');
    await d.getByLabel('Celular (WhatsApp)').fill('999 123 4567');
    await d.getByRole('checkbox').nth(1).check();
    await d.getByRole('button', { name: 'Confirmar reservación' }).click();
    await p.waitForURL(/#\/cita\/[0-9a-f-]{36}$/i); await p.getByText('Confirmada', { exact: true }).waitFor();
    await shot('05-clienta-comprobante'); return checkLayout(p, vp, 'comprobante');
  });
  await step(vp, 'clienta: cancela su cita desde el comprobante', async () => {
    await p.getByRole('button', { name: 'Cancelar mi cita' }).click();
    await dlg('¿Cancelar tu cita?').getByRole('button', { name: 'Sí, cancelar' }).click();
    await p.getByText('Cancelada', { exact: true }).waitFor(); await shot('06-clienta-cancelada');
  });
  await step(vp, 'clienta: Mi cuenta y aviso de privacidad abren', async () => {
    await p.goto(BASE + '#/cuenta'); await p.getByRole('link', { name: /Volver a reservar/ }).waitFor(); await shot('07-clienta-cuenta');
    await p.goto(BASE); await p.getByRole('button', { name: 'Abrir menú' }).click();
    await p.getByRole('button', { name: 'Aviso de privacidad' }).click();
    await p.getByRole('dialog').filter({ hasText: /privacidad/i }).last().waitFor(); await shot('08-clienta-privacidad');
    await p.keyboard.press('Escape');
  });

  // ---------- Dueña ----------
  await step(vp, 'panel: entra con permisos y muestra la agenda', async () => {
    await p.goto(BASE + '#/admin'); await p.getByRole('navigation', { name: 'Navegación principal' }).waitFor();
    await p.getByRole('heading', { name: 'Mi agenda' }).waitFor(); await shot('10-panel-dia'); return checkLayout(p, vp, 'panel');
  });
  await step(vp, 'panel: vistas Semana, Mes y Día', async () => {
    for (const [v, n] of [['Semana', '11-panel-semana'], ['Mes', '12-panel-mes'], ['Día', '10b-panel-dia']]) {
      const t = p.getByRole('tab', { name: v }); await t.click();
      if (await t.getAttribute('aria-selected') !== 'true') throw new Error(`la vista ${v} no se activó`); await shot(n);
    }
  });
  const client = `Clienta Prueba ${vp}`;
  await step(vp, 'panel: crea una cita manual y aparece en la agenda', async () => {
    const dates = Array.from({ length: 10 }, (_, i) => { const d = new Date(Date.now() + (i + 2) * 864e5); return d.toLocaleDateString('en-CA', { timeZone: 'America/Merida' }); });
    for (const day of dates) for (const time of ['10:00', '12:00', '16:00']) {
      await p.getByRole('button', { name: 'Nueva cita' }).click();
      const d = dlg('Nueva cita manual'); await d.waitFor();
      await d.getByLabel('Fecha').fill(day); await d.getByLabel('Hora').fill(time);
      await d.getByLabel('Nombre de la clienta').fill(client); await d.getByLabel('Celular').fill('999 765 4321');
      await d.getByRole('button', { name: 'Guardar cita' }).click();
      const closed = await d.waitFor({ state: 'detached', timeout: 2500 }).then(() => true, () => false);
      if (closed) { await p.getByText(client).first().waitFor(); await shot('13-panel-cita-creada'); return `${day} ${time}`; }
      await p.keyboard.press('Escape'); await d.waitFor({ state: 'detached' });
    }
    throw new Error('no se encontró un horario libre para la cita manual');
  });
  await step(vp, 'panel: abre la cita y la cancela', async () => {
    await p.getByRole('button', { name: `Editar cita de ${client}` }).first().click();
    const d = dlg('Detalle de la cita'); await d.waitFor(); await shot('14-panel-detalle');
    await d.getByRole('button', { name: 'Cancelar esta cita' }).click();
    await d.getByRole('button', { name: 'Sí, cancelar cita' }).click(); await d.waitFor({ state: 'detached' });
    await p.locator('.appt.cancelled').filter({ hasText: client }).first().waitFor();
  });
  await step(vp, 'panel: bloquea unas horas de un día futuro', async () => {
    await p.getByRole('button', { name: 'Bloquear' }).click();
    const d = dlg('Bloquear fechas u horas'); await d.waitFor();
    const far = new Date(Date.now() + 40 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Merida' });
    await d.getByLabel('Desde').fill(far); await d.getByLabel('Solo unas horas de ese día').check();
    await d.getByLabel('Motivo (privado)').fill('Prueba automática');
    await d.getByRole('button', { name: 'Bloquear', exact: true }).click();
    await d.getByText(/Listo|Se bloqueó/).waitFor(); await shot('15-panel-bloqueo');
    await d.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  });
  for (const [tab, n, heading] of [['Clientas', '16-panel-clientas'], ['Servicios', '17-panel-servicios'], ['Ajustes', '18-panel-ajustes']]) {
    await step(vp, `panel: pestaña ${tab}`, async () => {
      await p.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: tab }).click();
      await p.getByRole('navigation', { name: 'Navegación principal' }).locator('[aria-current="page"]', { hasText: tab }).waitFor();
      await p.waitForTimeout(150); await shot(n); return checkLayout(p, vp, tab);
    });
  }
  await step(vp, 'sin errores en la consola', async () => { if (errors.length) throw new Error(errors.join(' | ')); });
  await browser.close();
}

await mkdir(OUT, { recursive: true });
for (const vp of VIEWPORTS) await run(vp);
console.log(results.join('\n'));
console.log(failed ? `\n${failed} paso(s) fallaron. Capturas en ${OUT}/` : `\nTodo en orden. Capturas en ${OUT}/`);
process.exit(failed ? 1 : 0);
