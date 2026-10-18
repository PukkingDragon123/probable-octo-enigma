// Title screen: the train runs through golden fields behind a slanted ink
// band; the Kodamaya logo slams in (capsule mascot, 木霊屋, a vermilion
// KODAMAYA slab), the menu slides in item by item, and the selected item jumps
// forward on its slab. Hover, tap, arrows + Enter all drive it; the big
// confirm flashes, flings the menu away and wipes into the game.
import './title.css';
import { PixCanvas } from '../core/pixtex.js';
import { typeEl, typeHTML, INK, CREAM, RED, GOLD } from './pixtype.js';
import { MenuList, menuItem, sfx, shutter, kbd, isTouch, paintCapsule } from './menu.js';
import { openSettings, openCredits } from './panels.js';

// the capsule mascot: a gacha capsule with a sleepy little face and a sprout
export function paintMascot() {
  const p = new PixCanvas(40, 44, 3);
  const cx = 20, cy = 25;
  p.circle(cx, cy, 16.5, INK);
  p.circle(cx, cy, 15, '#fff6ea');
  p.ellipse(cx, cy - 5, 15, 10.5, RED);
  p.ellipse(cx - 6, cy - 9, 4, 2.4, '#ff9a88');
  p.px(cx - 8, cy - 10, '#ffffff'); p.px(cx - 7, cy - 10, '#ffffff');
  p.rect(cx - 15, cy, 31, 2, INK);
  p.rect(cx - 6, cy + 5, 2, 3, INK); p.rect(cx + 5, cy + 5, 2, 3, INK);
  p.hline(cx - 2, cx + 2, cy + 10, INK); p.px(cx - 3, cy + 9, INK); p.px(cx + 3, cy + 9, INK);
  p.rect(cx - 11, cy + 8, 3, 1, '#ffb0c0'); p.rect(cx + 9, cy + 8, 3, 1, '#ffb0c0');
  p.ellipse(cx + 9, cy + 11, 3, 2, '#efe0cc');
  // sprout (kodama = tree spirit)
  p.line(cx + 3, cy - 15, cx + 5, cy - 21, '#2e6a2a', 2);
  p.ellipse(cx + 9, cy - 22, 4.5, 2.4, INK); p.ellipse(cx + 9, cy - 22, 3.5, 1.5, '#7ac85a');
  p.ellipse(cx + 1, cy - 21, 3.8, 2.2, INK); p.ellipse(cx + 1, cy - 21, 2.8, 1.3, '#9ad870');
  return p;
}
const ITEMS = [
  { id: 'continue', label: 'CONTINUE', ja: 'つづきから' },
  { id: 'new', label: 'NEW GAME', ja: 'はじめから' },
  { id: 'settings', label: 'SETTINGS', ja: 'せってい' },
  { id: 'credits', label: 'CREDITS', ja: 'クレジット' },
];

export class TitleScreen {
  constructor(root, { hasSave, onStart, settings = null }) {
    this.onStart = onStart;
    this.settings = settings;
    const el = (this.el = document.createElement('div'));
    el.className = 'title';
    const cap = paintCapsule().c.toDataURL(), capG = paintCapsule(GOLD).c.toDataURL(), capT = paintCapsule('#5ab8f0').c.toDataURL();
    const floaters = Array.from({ length: 9 }, (_, i) => `<i style="--i:${i};--x:${(i * 37) % 100};--d:${7 + (i % 4) * 2.3}s;--s:${1 + (i % 3) * 0.5};background-image:url(${[cap, capG, capT][i % 3]})"></i>`).join('');
    el.innerHTML = `
      <div class="t-shade"></div>
      <div class="t-band"><i class="b-gold"></i><i class="b-red"></i><i class="b-ink"></i><div class="t-float">${floaters}</div>
        <div class="t-kanji">${[...'木霊屋'].map((c) => typeHTML(c, { size: 24, slant: 0, shadow: 0, outline: null, fill: CREAM, hollow: true })).join('')}</div></div>
      <div class="t-logo">
        <div class="t-mascot"><img src="${paintMascot().c.toDataURL()}" alt=""></div>
        <div class="t-name"></div>
        <div class="t-slab"><i></i></div>
        <div class="t-tag k-sk">ガチャと茶屋と、ちいさな魂。</div>
      </div>
      <nav class="t-menu"></nav>
      <div class="t-foot">${isTouch() ? '<span>Tap to choose</span>' : `<span>${kbd('↑')}${kbd('↓')} Select</span><span>${kbd('Enter')} Confirm</span>`}<span class="t-snd">♪ sound on</span></div>
      <div class="t-flash"></div>`;
    const name = typeEl('木霊屋', { size: 40, slant: 0.12, outline2: CREAM, shadow: 3, shadowColor: RED });
    const glint = document.createElement('i');
    glint.className = 't-glint';
    glint.style.cssText = `-webkit-mask-image:url(${name.src});mask-image:url(${name.src})`;
    el.querySelector('.t-name').append(name, glint);
    el.querySelector('.t-slab').appendChild(typeEl('KODAMAYA', { size: 15, spacing: 2, fill: CREAM, outline: INK, shadow: 2 }));
    root.appendChild(el);
    // menu
    const nav = el.querySelector('.t-menu');
    this.items = ITEMS.map((it, i) => {
      const b = menuItem(it.label, it.ja, { size: 17 });
      b.style.setProperty('--ix', `${-i * 20}px`);
      b.style.setProperty('--n', i);
      if (it.id === 'continue' && !hasSave) b.classList.add('off');
      nav.appendChild(b);
      return b;
    });
    this.list = new MenuList(this.items, { index: hasSave ? 0 : 1, onPick: (i) => this.pick(ITEMS[i].id) });
    this.list.enabled = false;
    // a little parallax: logo, menu and the floating capsules lean with the pointer
    el.addEventListener('pointermove', (e) => {
      el.style.setProperty('--mx', (e.clientX / innerWidth - 0.5).toFixed(3));
      el.style.setProperty('--my', (e.clientY / innerHeight - 0.5).toFixed(3));
    });
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { this.list.enabled = true; sfx('uiSlam', { volume: 0.4 }); }, 650);
  }
  async pick(id) {
    if (this.busy) return;
    if (id === 'settings' || id === 'credits') {
      sfx('uiConfirm', { volume: 0.45 });
      this.busy = true;
      this.el.classList.add('dim');
      if (id === 'settings') await openSettings(this.settings); else await openCredits();
      this.el.classList.remove('dim');
      this.busy = false;
      return;
    }
    this.busy = true;
    this.list.close();
    sfx('uiStart', { volume: 0.6 });
    this.el.classList.add('go');
    await new Promise((r) => setTimeout(r, 520));
    await shutter(() => {
      this.el.remove();
      this.onStart(id);
    }, { hold: 260 });
  }
  close() { this.el.remove(); }
}
