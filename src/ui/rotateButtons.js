// Two slanted buttons in the corner that turn the camera 45° at a time, shown
// in places whose camCfg says `rotatable` (Kodamaya's tea-house shop). Q / E
// do the same on a keyboard.
import './rotateButtons.css';
import { PixCanvas } from '../core/pixtex.js';
import { kbd, isTouch } from './menu.js';

// a pixel "turn" arrow (13x13): a 2-texel ring open at the top right, ending in an
// arrowhead (clockwise), mirrored for the other way
function arrow(flip) {
  const p = new PixCanvas(13, 13);
  const X = (x) => (flip ? 12 - x : x);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
    const dx = x - 6, dy = y - 6, d = Math.hypot(dx, dy);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (d >= 3.6 && d <= 5.7 && !(a > -28 && a < 62)) p.px(X(x), y, '#fff3dc');
  }
  p.poly([[X(7.4), 3.2], [X(12.9), 3.2], [X(10.1), 7.6]], '#fff3dc');
  return p.c.toDataURL();
}

export class RotateButtons {
  constructor(game, root) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.className = 'rot-btns';
    const keys = !isTouch();
    this.el.innerHTML = `<button class="rot-l" aria-label="Turn left"><img src="${arrow(true)}" alt="">${keys ? kbd('Q') : ''}</button><button class="rot-r" aria-label="Turn right"><img src="${arrow(false)}" alt="">${keys ? kbd('E') : ''}</button>`;
    root.appendChild(this.el);
    const turn = (k) => (e) => {
      e.stopPropagation(); e.preventDefault();
      this.game.rig.rotate(k);
      this.game.audio?.play?.('uiTick', { volume: 0.35 });
      const b = e.currentTarget; b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin');
    };
    this.el.querySelector('.rot-l').addEventListener('pointerdown', turn(1));
    this.el.querySelector('.rot-r').addEventListener('pointerdown', turn(-1));
    this.on = false;
  }
  update() {
    const g = this.game, L = g.location;
    const on = !!(L && L.camCfg?.rotatable && !g.director.inCutscene && !g.rig.pov);
    if (on !== this.on) { this.on = on; this.el.classList.toggle('on', on); }
  }
}
