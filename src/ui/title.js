// Title screen: the painted Kodamaya logo (木霊屋 + a capsule mascot), a soft
// "tap to start", and New / Continue as little wooden ema plaques.
import './title.css';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';

export function paintLogo() {
  const W = 260, H = 120;
  const p = new PixCanvas(W, H, 3);
  // capsule mascot (a gacha capsule with a tiny face) on the left
  const cx = 40, cy = 58;
  p.circle(cx, cy, 28, '#2a1828');
  p.circle(cx, cy, 26, '#fff6ea');
  p.ellipse(cx, cy - 8, 26, 18, '#ff6a5a');
  p.rect(cx - 26, cy - 2, 53, 3, '#2a1828');
  p.ellipse(cx - 8, cy - 14, 6, 4, '#ffb0a0');
  p.rect(cx - 9, cy + 7, 3, 4, '#2a1828'); p.rect(cx + 7, cy + 7, 3, 4, '#2a1828');
  p.hline(cx - 3, cx + 3, cy + 15, '#2a1828'); p.px(cx - 4, cy + 14, '#2a1828'); p.px(cx + 4, cy + 14, '#2a1828');
  p.ellipse(cx - 14, cy + 13, 3, 1.5, '#ffb0c0'); p.ellipse(cx + 14, cy + 13, 3, 1.5, '#ffb0c0');
  // a little leaf sprout (kodama = tree spirit)
  p.line(cx + 6, cy - 26, cx + 10, cy - 36, '#4a8a3a', 2);
  p.ellipse(cx + 15, cy - 38, 6, 3, '#7ac85a'); p.ellipse(cx + 4, cy - 37, 5, 2.5, '#9ad870');
  // title: Japanese in big brush-ish letters + romaji
  p.text('木霊屋', 168, 6, { font: '46px "Dela Gothic One"', color: '#fff3dc', align: 'center', outline: '#2a1828', shadow: { dx: 3, dy: 3, color: '#2a1828' } });
  p.text('KODAMAYA', 168, 66, { font: '26px "Mochiy Pop One"', color: '#ffd060', align: 'center', outline: '#2a1828', shadow: { dx: 2, dy: 2, color: '#8a3a2a' }, letterSpacing: 2 });
  p.text('ガチャと茶屋と、ちいさな魂。', 168, 100, { font: '11px Galmuri11', color: '#fff3dc', align: 'center', outline: '#2a1828' });
  return p;
}

export class TitleScreen {
  constructor(root, { hasSave, onStart }) {
    this.el = document.createElement('div');
    this.el.className = 'title';
    const logo = paintLogo();
    this.el.innerHTML = `<img class="t-logo" src="${logo.c.toDataURL()}">
      <div class="t-buttons">
        ${hasSave ? '<button class="t-ema" data-c="continue"><span>Continue</span></button>' : ''}
        <button class="t-ema" data-c="new"><span>${hasSave ? 'New game' : 'Begin'}</span></button>
      </div>
      <div class="t-foot">Tap to begin · sound on recommended</div>`;
    root.appendChild(this.el);
    this.el.querySelectorAll('.t-ema').forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.close(); onStart(b.dataset.c); }));
  }
  close() { this.el.classList.add('out'); setTimeout(() => this.el.remove(), 900); }
}
