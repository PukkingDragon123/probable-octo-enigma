// Scripted playthrough with periodic screenshots.
// node tools/play.mjs <url> <outPrefix> [shots=6] [interval=4000] [clickEveryMs=0] [w=1280] [h=720]
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [url, out, shots = '6', interval = '4000', clickEvery = '0', w = '1280', h = '720'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
await page.goto(url, { waitUntil: 'load' });
let clicker = null;
if (+clickEvery > 0) clicker = setInterval(() => { page.mouse.click(+w * 0.5, +h * 0.35).catch(() => {}); }, +clickEvery);
for (let i = 0; i < +shots; i++) {
  await page.waitForTimeout(+interval);
  await page.screenshot({ path: `${out}${String(i).padStart(2, '0')}.png` });
  const fps = await page.evaluate(() => (window.__game ? Math.round(window.__game.time * 10) / 10 : -1)).catch(() => -2);
  console.log('shot', i, 'gameTime', fps);
}
if (clicker) clearInterval(clicker);
console.log(logs.filter((l) => !l.includes('vite')).slice(0, 40).join('\n'));
await browser.close();
