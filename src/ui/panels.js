// Full-screen menu panels shared by the title screen and the pause menu:
// settings, chapter select, credits and a yes / no confirm. Each slams in on a
// slanted ink card over a vermilion band, owns the keyboard while open and
// resolves when closed.
import { MenuList, menuItem, sliderRow, cyclerRow, sfx, kbd, isTouch } from './menu.js';
import { typeEl, typeHTML } from './pixtype.js';
import { TEXT_SPEEDS } from './settings.js';
import { CHAPTERS } from './chapters.js';

export class Panel {
  constructor({ title, ja = '', kanji = '', change = true }) {
    this.el = document.createElement('div');
    this.el.className = 'k-panel';
    this.el.innerHTML = `<div class="k-pbg"></div><div class="k-pband"></div><div class="k-pkanji">${[...kanji].map((c) => typeHTML(c, { size: 24, slant: 0, shadow: 0, outline: null, fill: '#fff3dc', hollow: true })).join('')}</div>
      <div class="k-pcard"><header class="k-phead"></header><div class="k-pbody"></div><footer class="k-pfoot"></footer></div>`;
    const head = this.el.querySelector('.k-phead');
    head.appendChild(typeEl(title, { size: 22, outline2: '#fff3dc' }));
    if (ja) { const j = document.createElement('span'); j.className = 'k-pja'; j.textContent = ja; head.appendChild(j); }
    this.body = this.el.querySelector('.k-pbody');
    this.foot = this.el.querySelector('.k-pfoot');
    this.foot.innerHTML = isTouch() ? 'Tap to choose' : `<span>${kbd('↑')}${kbd('↓')} Select</span>${change ? `<span>${kbd('←')}${kbd('→')} Change</span>` : ''}<span>${kbd('Enter')} OK</span><span>${kbd('Esc')} Back</span>`;
    this.el.addEventListener('click', (e) => { if (e.target === this.el.querySelector('.k-pbg') || e.target === this.el) this.back(); });
    this.done = new Promise((res) => { this.resolve = res; });
  }
  show(rows, o = {}) {
    rows.forEach((r, i) => { r.style.setProperty('--n', i); this.body.appendChild(r); });
    document.body.appendChild(this.el);
    sfx('uiOpen', { volume: 0.45 });
    requestAnimationFrame(() => this.el.classList.add('in'));
    this.list = new MenuList(rows, { onPick: (i, el) => this.pick(i, el), onBack: () => this.back(), onSide: (i, d) => rows[i].side?.(d), ...o });
    return this.done;
  }
  pick() {}
  back() { this.close(null, true); }
  close(value, back = false) {
    if (this.closing) return;
    this.closing = true;
    this.list?.close();
    if (back) sfx('uiBack', { volume: 0.5 }); else sfx('uiClose', { volume: 0.4 });
    this.el.classList.add('out');
    setTimeout(() => this.el.remove(), 260);
    this.resolve(value);
  }
}

// settings: music / sound volume, text speed, screen shake
export function openSettings(settings) {
  const P = new Panel({ title: 'SETTINGS', ja: 'せってい', kanji: '設定' });
  const rows = [
    sliderRow('MUSIC', settings.vol('music'), (v) => settings.setVol('music', v)),
    sliderRow('SOUND FX', settings.vol('sfx'), (v) => { settings.setVol('sfx', v); sfx('pop', { volume: 0.5 }); }),
    cyclerRow('TEXT SPEED', TEXT_SPEEDS.map((t) => t.label), settings.data.text ?? 1, (i) => settings.set('text', i)),
    cyclerRow('SCREEN SHAKE', ['ON', 'OFF'], settings.shake ? 0 : 1, (i) => settings.set('shake', i === 0)),
    menuItem('BACK', 'もどる', { size: 12 }),
  ];
  P.pick = (i, el) => { if (i === rows.length - 1) P.close(); else el.cycle?.(); };
  return P.show(rows);
}

// chapter select: resolves with a chapter id (or null)
export function openChapters(current) {
  const P = new Panel({ title: 'CHAPTERS', ja: 'しょう', kanji: '章', change: false });
  const rows = CHAPTERS.map((c, i) => {
    const r = document.createElement('div');
    r.className = 'k-row k-chap' + (c.id === current ? ' cur' : '');
    r.innerHTML = `<i class="k-slab"><i></i></i><b class="k-cn">${String(i + 1).padStart(2, '0')}</b><span class="k-rl"></span><span class="k-cja">${c.ja}</span>`;
    r.querySelector('.k-rl').appendChild(typeEl(c.title.toUpperCase(), { size: 10, slant: 0.18 }));
    return r;
  });
  rows.push(menuItem('BACK', 'もどる', { size: 12 }));
  P.pick = (i) => { if (i === rows.length - 1) P.close(); else { sfx('uiConfirm', { volume: 0.5 }); P.close(CHAPTERS[i].id); } };
  const at = Math.max(0, CHAPTERS.findIndex((c) => c.id === current));
  return P.show(rows, { index: at });
}

export function openCredits() {
  const P = new Panel({ title: 'CREDITS', ja: 'クレジット', kanji: '感謝', change: false });
  const box = document.createElement('div');
  box.className = 'k-credits';
  box.innerHTML = `<h4>KODAMAYA</h4><p>A cozy story about a gachapon shop, a tea house, and the little spirits who live behind them.</p>
    <h4>TYPE</h4><p><em>Galmuri</em> pixel fonts · <em>Dela Gothic One</em> · <em>Mochiy Pop One</em> · <em>RocknRoll One</em> · <em>Yusei Magic</em> · <em>Hachi Maru Pop</em> — SIL Open Font License</p>
    <h4>ENGINE</h4><p><em>three.js</em> · <em>Vite</em> · every sound and song synthesised live in the browser</p>
    <h4>THANK YOU</h4><p>for visiting Kodama-machi. Grandpa saved you a cup of tea.</p>`;
  const back = menuItem('BACK', 'もどる', { size: 12 });
  P.pick = () => P.close();
  P.body.appendChild(box);
  return P.show([back]);
}

// yes / no: resolves true / false
export function confirmBox(title, msg, { yes = 'YES', no = 'NO' } = {}) {
  const P = new Panel({ title, ja: 'かくにん', kanji: '確認' });
  const m = document.createElement('div');
  m.className = 'k-msg';
  m.innerHTML = msg;
  P.body.appendChild(m);
  const y = menuItem(yes, '', { size: 13 }), n = menuItem(no, '', { size: 13 });
  const row = document.createElement('div');
  row.className = 'k-yesno';
  row.append(y, n);
  P.body.appendChild(row);
  P.pick = (i) => P.close(i === 0);
  P.back = () => P.close(false, true);
  // horizontal pair: left / right move too
  const done = P.show([y, n], { index: 1, onSide: (i, d) => P.list.select(i + d) });
  y.remove(); n.remove(); row.append(y, n);
  return done.then((v) => !!v);
}
