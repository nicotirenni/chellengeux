// Graba los GIFs de la presentación: node scripts/gifs.mjs [url] [solo-estos,ids]
// Playwright (Chromium, 390x844 @2x, táctil) → video → ffmpeg → gifs/NN-nombre.gif + .mp4
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:4175/').replace(/\/?$/, '/') + '?rec';
const ONLY = process.argv[3]?.split(',');
const OUT = new URL('../gifs/', import.meta.url).pathname;
const TMP = new URL('../.gif-tmp/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });

// Indicador de toque: círculo que se expande en cada tap y estela del dedo al deslizar. Lo dibuja el script, no la app.
const VIZ = () => {
  const css = `
  .__viz{position:fixed;inset:0;pointer-events:none;z-index:2147483647}
  .__tap{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
    background:rgba(90,30,158,.28);border:2px solid rgba(90,30,158,.75);animation:__tap .55s ease-out forwards}
  @keyframes __tap{from{transform:scale(.45);opacity:1}to{transform:scale(1.5);opacity:0}}
  .__finger{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;
    background:rgba(90,30,158,.3);border:2px solid rgba(90,30,158,.8);transition:opacity .25s}
  .__dot{position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:rgba(90,30,158,.45);animation:__dot .6s ease-out forwards}
  @keyframes __dot{to{opacity:0;transform:scale(.4)}}`;
  let root, finger, down = null, moved = false;
  const mount = () => {
    if (root) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    root = document.createElement('div'); root.className = '__viz'; document.body.appendChild(root);
  };
  const add = (cls, x, y, ms) => { mount(); const d = document.createElement('div'); d.className = cls; d.style.left = x + 'px'; d.style.top = y + 'px'; root.appendChild(d); if (ms) setTimeout(() => d.remove(), ms); return d; };
  window.__viz = { tap: (x, y) => add('__tap', x, y, 600) };
  addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; moved = false; }, true);
  addEventListener('pointermove', (e) => {
    if (!down) return;
    if (!moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) return;
    if (!moved) { moved = true; finger = add('__finger', down.x, down.y); }
    finger.style.left = e.clientX + 'px'; finger.style.top = e.clientY + 'px';
    add('__dot', e.clientX, e.clientY, 650);
  }, true);
  const up = (e) => {
    if (!down) return;
    if (!moved) add('__tap', e.clientX, e.clientY, 600);
    else if (finger) { const f = finger; f.style.opacity = '0'; setTimeout(() => f.remove(), 300); }
    down = null; finger = null;
  };
  addEventListener('pointerup', up, true);
  addEventListener('pointercancel', up, true);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const results = [];

async function record(name, desc, fn) {
  if (ONLY && !ONLY.some((o) => name.startsWith(o))) return;
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    recordVideo: { dir: TMP, size: { width: 780, height: 1688 } },
  });
  await ctx.addInitScript(VIZ);
  const t0 = Date.now();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  const h = helpers(page, cdp);
  // Estado limpio: contexto nuevo y página recién cargada. Arranca cuando el Home ya trajo los datos.
  await page.goto(BASE);
  await page.waitForSelector('.home__content');
  // Margen para que el video ya tenga el Home completo en su primer cuadro.
  await page.waitForTimeout(1000);
  const start = (Date.now() - t0) / 1000;
  await page.waitForTimeout(800);
  let note = '';
  try {
    note = (await fn(page, h)) ?? '';
  } catch (e) {
    note = `FALLÓ: ${e.message.split('\n')[0]}`;
  }
  await page.waitForTimeout(1200);
  const dur = (Date.now() - t0) / 1000 - start;
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  const wall = (Date.now() - t0) / 1000;
  const vdur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString());
  const gif = `${OUT}${name}.gif`, mp4 = `${OUT}${name}.mp4`;
  const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
  ff(['-ss', start.toFixed(2), '-t', dur.toFixed(2), '-i', src, '-vf', 'fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
  // GIF: 390 px, 15 fps, paleta por archivo. Si pasa de 4 MB, se baja el dithering.
  for (const dither of ['bayer:bayer_scale=5', 'bayer:bayer_scale=3', 'none']) {
    ff(['-ss', start.toFixed(2), '-t', dur.toFixed(2), '-i', src, '-vf',
      `fps=15,scale=390:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=${dither}:diff_mode=rectangle`, gif]);
    if (statSync(gif).size <= 4 * 1024 * 1024) break;
  }
  const r = { name, desc, dur, gif: statSync(gif).size, mp4: statSync(mp4).size, note: [note, ...errors.map((e) => `error: ${e}`)].filter(Boolean).join(' · ') };
  results.push(r);
  console.log(`✓ ${name}  ${dur.toFixed(1)} s  ${(r.gif / 1048576).toFixed(2)} MB${r.note ? '  · ' + r.note : ''}`);
}

function helpers(page, cdp) {
  const top = () => page.locator('.app__screen:not([aria-hidden="true"])');
  const wait = (ms) => page.waitForTimeout(ms);
  const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const tap = async (loc, after = 500) => { await loc.scrollIntoViewIfNeeded(); await loc.tap(); await wait(after); };
  /** Arrastre con el dedo (eventos táctiles reales: la app los recibe como pointer events). */
  const drag = async (from, to, ms = 500, hold = 0) => {
    const steps = Math.max(8, Math.round(ms / 16));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }] });
      await wait(ms / steps);
    }
    if (hold) await wait(hold);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const swipeLeft = async (loc, dx) => { const b = await loc.boundingBox(); const y = b.y + b.height / 2, x = b.x + b.width - 30; await drag({ x, y }, { x: x - dx, y }, 450, 120); };
  /** Scroll con el dedo: el dedo sube y la lista baja. */
  const scrollBy = async (dy, ms = 900) => { const x = 195, y = 560; await drag({ x, y }, { x, y: y - dy }, ms, 80); await wait(250); };
  const type = async (loc, text) => { await tap(loc, 250); await loc.pressSequentially(text, { delay: 75 }); await wait(300); };
  /** Select nativo: el desplegable del sistema no sale en el video, así que se marca el toque y se elige el valor. */
  const select = async (loc, value, after = 450) => {
    await loc.scrollIntoViewIfNeeded();
    const c = await center(loc);
    await page.evaluate(([x, y]) => window.__viz.tap(x, y), [c.x, c.y]);
    await wait(350);
    await loc.selectOption(value);
    await wait(after);
  };
  const btn = (name, scope = top()) => scope.getByRole('button', { name, exact: true });
  const nav = (name) => page.locator('.app__nav').getByRole('button', { name: new RegExp('^' + name) });
  const openEvent = async () => { await tap(top().getByRole('button', { name: /^Matías y Sofía Ocampo/ }).first(), 1400); };
  const card = (title) => top().locator('.task', { hasText: title });
  return { top, wait, tap, drag, swipeLeft, scrollBy, type, select, btn, nav, openEvent, card };
}

// 1 · La microinteracción principal.
await record('01-eliminar-tarea-deshacer', 'Deslizar una tarea revela Eliminar; el Snackbar con cuenta regresiva de 5 s permite deshacer.', async (page, h) => {
  await h.openEvent();
  const c = h.card('Comprar hielo');
  await h.swipeLeft(c.locator('.task__content'), 110); await h.wait(700);
  await h.tap(c.locator('.task__delete'), 1800);
  await h.tap(page.locator('.snack').getByRole('button', { name: 'Deshacer' }), 1300);
});

await record('02-eliminar-tarea-confirmada', 'Sin deshacer: a los 5 s el Snackbar se va y recién ahí sale el aviso al responsable.', async (page, h) => {
  await h.openEvent();
  const c = h.card('Comprar hielo');
  await h.swipeLeft(c.locator('.task__content'), 110); await h.wait(500);
  await h.tap(c.locator('.task__delete'), 5300);
  await h.tap(h.nav('Notificaciones'), 1100);
});

await record('03-eliminar-evento', 'Drawer con resumen: Cancelar es la acción principal; Eliminar evento en rojo contorno. Vuelve al Home y entra el Snackbar.', async (page, h) => {
  await h.openEvent();
  await h.tap(h.top().getByLabel('Opciones del evento'), 600);
  await h.tap(page.getByRole('menuitem', { name: 'Eliminar evento' }), 1700);
  await h.tap(page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar', exact: true }), 700);
  await h.tap(h.top().getByLabel('Opciones del evento'), 600);
  await h.tap(page.getByRole('menuitem', { name: 'Eliminar evento' }), 1100);
  await h.tap(page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar evento', exact: true }), 2600);
});

await record('04-editar-tarea', 'Editar desde el ⋮ de la tarjeta: Guardar se habilita al cambiar algo; el Alert avisa a quién le llega el aviso.', async (page, h) => {
  await h.openEvent();
  await h.tap(h.top().getByLabel('Acciones de Definir DJ'), 500);
  await h.tap(h.top().getByRole('menuitem', { name: 'Editar' }), 1000);
  await h.select(h.top().getByLabel('Fecha', { exact: true }), '26 OCT');
  await h.select(h.top().locator('.field', { hasText: 'Responsable' }).locator('select'), 'Sofía', 700);
  await h.tap(h.btn('Guardar'), 1900);
});

await record('05-editar-evento', 'Editar evento: al cambiar la fecha aparece «Mover tareas también»; Guardar actualiza el evento y sus tareas.', async (page, h) => {
  await h.openEvent();
  await h.tap(h.top().getByLabel('Opciones del evento'), 600);
  await h.tap(page.getByRole('menuitem', { name: 'Editar evento' }), 1000);
  await h.select(h.top().locator('.field', { hasText: /^Fecha/ }).locator('select'), '2026-10-27', 900);
  await h.tap(h.top().locator('.toggle-row'), 800);
  await h.tap(h.btn('Guardar'), 2000);
  return '«Mover tareas también» aparece al cambiar la fecha (antes de Guardar), como está diseñado.';
});

await record('06-crear-tarea', 'Crear tarea desde el +: evento elegido en una hoja, responsable opcional y el Alert de «sin responsable».', async (page, h) => {
  await h.tap(page.locator('.bottomnav__create'), 600);
  await h.tap(page.getByRole('menuitem', { name: 'Nueva tarea' }), 900);
  await h.tap(h.top().locator('.field__select'), 700);
  await h.tap(page.locator('.event-option').first(), 600);
  await h.type(h.top().getByPlaceholder('Por ejemplo, Comprar hielo'), 'Comprar flores');
  await h.select(h.top().getByLabel('Fecha', { exact: true }), '25 OCT', 300);
  await h.select(h.top().getByLabel('Hora', { exact: true }), '11:00', 900);
  await h.tap(h.btn('Crear tarea'), 1700);
});

await record('07-crear-evento-2-pasos', 'Crear evento en 2 pasos: datos del evento y colaboradores con buscador que filtra en vivo.', async (page, h) => {
  await h.tap(page.locator('.bottomnav__create'), 600);
  await h.tap(page.getByRole('menuitem', { name: 'Nuevo evento' }), 900);
  await h.type(h.top().getByPlaceholder('Por ejemplo, Cumple de Juana'), 'Asado');
  await h.select(h.top().locator('select').nth(0), 'Otro', 300);
  await h.select(h.top().locator('select').nth(1), { index: 20 }, 500);
  await h.tap(h.btn('Continuar'), 800);
  await h.type(h.top().getByPlaceholder('Buscar por nombre o email'), 'ma');
  await h.wait(400);
  await h.tap(h.top().getByRole('checkbox', { name: /Martín/ }), 700);
  await h.tap(h.btn('Crear evento'), 1800);
});

await record('08-crear-evento-sin-colaboradores', 'Evento creado sin colaboradores: estado vacío en Equipo y alta desde Agregar colaboradores.', async (page, h) => {
  await h.tap(page.locator('.bottomnav__create'), 600);
  await h.tap(page.getByRole('menuitem', { name: 'Nuevo evento' }), 900);
  await h.type(h.top().getByPlaceholder('Por ejemplo, Cumple de Juana'), 'Cena');
  await h.select(h.top().locator('select').nth(0), 'Otro', 200);
  await h.select(h.top().locator('select').nth(1), { index: 30 }, 300);
  await h.tap(h.btn('Continuar'), 600);
  await h.tap(h.btn('Crear evento'), 1100);
  await h.tap(h.top().getByRole('tab', { name: 'Equipo' }), 1000);
  await h.tap(h.btn('Agregar colaboradores'), 800);
  await h.tap(h.top().getByRole('checkbox', { name: /Camila/ }), 500);
  await h.tap(h.btn('Agregar (1)'), 1200);
});

await record('09-notificacion-en-vivo', 'Martín cambia el estado de una tarea desde su teléfono: contador en la campana y el item nuevo en Notificaciones.', async (page, h) => {
  await h.wait(500);
  // Lo que en la vida real llega del servidor: lo dispara el script, sin controles en la interfaz.
  await page.evaluate(() => window.__rec.receiveStatus('t3', 'Martín', 'progreso'));
  await h.wait(1600);
  await h.tap(h.nav('Notificaciones'), 2000);
});

await record('10-conflicto-de-edicion', 'Carla edita «Definir DJ»; a los 6 s Martín guarda su cambio y aparece el aviso de conflicto.', async (page, h) => {
  await h.openEvent();
  await h.tap(h.top().getByLabel('Acciones de Definir DJ'), 450);
  await h.tap(h.top().getByRole('menuitem', { name: 'Editar' }), 0);
  await page.getByText('Martín cambió el horario hace 2 min').waitFor({ timeout: 8000 });
  await h.wait(2200);
  return 'Dura más de 12 s porque el conflicto llega a los 6 s de abrir Editar, como pide el spec.';
});

await record('11-lista-agrupada', 'Lista agrupada: Vencidas en rojo, Dom 25 OCT y los días siguientes con contadores; filtros por estado.', async (page, h) => {
  await h.openEvent();
  await h.wait(300);
  await h.scrollBy(330, 900);
  await h.scrollBy(330, 900);
  await h.scrollBy(-720, 700);
  for (const chip of ['Pendientes', 'En progreso', 'Finalizadas']) await h.tap(h.top().locator('.chip', { hasText: chip }), 800);
});

await record('12-calendario-y-buscar', 'Calendario con las tareas sin terminar y Buscar con resultados agrupados.', async (page, h) => {
  await h.tap(h.nav('Calendario'), 1300);
  await h.scrollBy(300, 1000);
  await h.tap(h.nav('Buscar'), 700);
  await h.type(h.top().locator('input[type="search"]'), 'mar');
  await h.wait(1300);
});

await browser.close();
rmSync(TMP, { recursive: true, force: true });

const mb = (b) => `${(b / 1048576).toFixed(2)} MB`;
const fs = await import('node:fs');
const prev = fs.existsSync(`${OUT}README.md`) ? fs.readFileSync(`${OUT}README.md`, 'utf8') : '';
const lines = new Map([...prev.matchAll(/^- \*\*(.+?)\*\*.*$/gm)].map((m) => [m[1], m[0]]));
for (const r of results) lines.set(r.name, `- **${r.name}** (${r.dur.toFixed(1)} s · GIF ${mb(r.gif)} · MP4 ${mb(r.mp4)}): ${r.desc}`);
fs.writeFileSync(`${OUT}README.md`, `# GIFs del prototipo\n\nGrabados con \`node scripts/gifs.mjs\` (Playwright, 390×844 @2x, táctil; GIF a 390 px y 15 fps, MP4 a 780 px).\n\n${[...lines.keys()].sort().map((k) => lines.get(k)).join('\n')}\n`);
