// Graba el flujo F9 (Reposo → deslizar → Eliminar → Snackbar → Deshacer) y lo convierte a GIF.
// Uso: npm run build && npx vite preview --port 4173 & npm run gif
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.env.URL ?? 'http://localhost:4173/?evento=ocampo';
const OUT = 'docs/f9-eliminar-tarea.gif';
const W = 375, H = 812;
const videoDir = mkdtempSync(join(tmpdir(), 'f9-'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: videoDir, size: { width: W, height: H } } });
const page = await ctx.newPage();
await page.goto(URL);
await page.waitForLoadState('networkidle');

// Indicador de dedo, solo para el GIF.
await page.addStyleTag({ content: `#finger{position:fixed;z-index:999;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;background:rgba(26,23,32,.28);border:2px solid rgba(255,255,255,.9);pointer-events:none;opacity:0;transition:opacity .12s,transform .12s}#finger.on{opacity:1;transform:scale(.85)}` });
await page.evaluate(() => {
  const f = document.createElement('div'); f.id = 'finger'; document.body.appendChild(f);
  addEventListener('mousemove', (e) => { f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => f.classList.add('on'), true);
  addEventListener('mouseup', () => f.classList.remove('on'), true);
});

const wait = (ms) => page.waitForTimeout(ms);
const card = page.getByRole('button', { name: /^Comprar hielo/ });
const box = await card.boundingBox();
const y = box.y + box.height / 2;
const startX = box.x + box.width - 40;

await page.mouse.move(startX, y);
await wait(1200);                                   // 1 · Reposo
await page.mouse.down();
await wait(150);
for (let i = 1; i <= 24; i++) { await page.mouse.move(startX - i * 3, y); await wait(16); } // 2 · Deslizando
await page.mouse.up();
await wait(900);                                    // Revelado (96 px)

const del = page.getByRole('button', { name: 'Eliminar' }).first();
const db = await del.boundingBox();
await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 12 });
await wait(250);
await page.mouse.down(); await wait(90); await page.mouse.up();   // 3 · Eliminada
await wait(2200);                                   // Snackbar + barra de tiempo

const undo = page.getByRole('button', { name: 'Deshacer' });
const ub = await undo.boundingBox();
await page.mouse.move(ub.x + ub.width / 2, ub.y + ub.height / 2, { steps: 14 });
await wait(200);
await page.mouse.down(); await wait(90); await page.mouse.up();   // Deshacer
await wait(1600);                                   // La tarjeta vuelve

await ctx.close();
await browser.close();

const webm = join(videoDir, readdirSync(videoDir).find((f) => f.endsWith('.webm')));
mkdirSync('docs', { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.4', '-i', webm,
  '-vf', `fps=20,scale=${W}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
  OUT]);
console.log('GIF listo:', OUT);
