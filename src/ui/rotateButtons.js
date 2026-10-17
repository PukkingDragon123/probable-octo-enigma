// Two round buttons in the corner that turn the camera 45° at a time, shown
// in places whose camCfg says `rotatable` (Kodamaya's tea-house shop). Q / E
// do the same on a keyboard.
import './rotateButtons.css';

export class RotateButtons {
  constructor(game, root) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.className = 'rot-btns';
    this.el.innerHTML = '<button class="rot-l" aria-label="Turn left">⟲</button><button class="rot-r" aria-label="Turn right">⟳</button>';
    root.appendChild(this.el);
    const turn = (k) => (e) => { e.stopPropagation(); e.preventDefault(); this.game.rig.rotate(k); this.game.audio?.play?.('phoneTap', { volume: 0.25 }); };
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
