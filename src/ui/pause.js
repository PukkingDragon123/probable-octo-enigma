// Pause menu (Esc, or the MENU tab top right). Game time stops (characters,
// cutscenes, timers, typing all hold) while a vermilion slash slams across
// the frozen frame: RESUME / SETTINGS / CHAPTERS / TITLE on the left, a card
// with where you are in the story on the right.
import './pause.css';
import { MenuList, menuItem, sfx, shutter, kbd, isTouch, onIdleKey, menuOpen } from './menu.js';
import { openSettings, openChapters, confirmBox } from './panels.js';
import { typeEl, typeHTML, CREAM, RED } from './pixtype.js';
import { CHAPTERS, PLACES, weekday } from './chapters.js';
import { paintMascot } from './title.js';
import { esc } from '../core/util.js';

const ITEMS = [
  { id: 'resume', label: 'RESUME', ja: 'つづける' },
  { id: 'settings', label: 'SETTINGS', ja: 'せってい' },
  { id: 'chapters', label: 'CHAPTERS', ja: 'しょう' },
  { id: 'title', label: 'TITLE', ja: 'タイトルへ' },
];

export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.el = null;
    onIdleKey((k, e) => {
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && this.canOpen()) { this.open(); return true; }
      return false;
    });
    // a hidden tab means a long frame on return: pause instead of lurching on
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.canOpen() && !this.game.autoPlay) this.open(); });
  }
  canOpen() { const g = this.game; return !this.el && g.hud?.on && !g.paused && !menuOpen() && !document.querySelector('.k-shutter, .title'); }
  open() {
    if (!this.canOpen()) return;
    const g = this.game;
    g.setPaused(true);
    sfx('uiOpen', { volume: 0.55 });
    const el = (this.el = document.createElement('div'));
    el.className = 'pause';
    el.innerHTML = `<i class="p-wash"></i><i class="p-s3"></i><i class="p-s2"></i><i class="p-s1"></i>
      <div class="p-kanji">${typeHTML('休', { size: 24, slant: 0, shadow: 0, outline: null, fill: CREAM, hollow: true })}</div>
      <header class="p-head"><span class="p-ja">ひとやすみ</span></header>
      <nav class="p-menu"></nav>
      <aside class="p-card">${this.cardHTML()}</aside>
      <footer class="p-foot">${isTouch() ? 'Tap to choose' : `<span>${kbd('↑')}${kbd('↓')} Select</span><span>${kbd('Enter')} OK</span><span>${kbd('Esc')} Resume</span>`}</footer>`;
    el.querySelector('.p-head').prepend(typeEl('PAUSE', { size: 30, outline2: CREAM, shadow: 3, shadowColor: RED }));
    el.querySelector('.p-card .pc-title').appendChild(typeEl(this.chapter().title.toUpperCase(), { size: 12, slant: 0.18, fill: CREAM, outline: '#141018' }));
    el.querySelector('.pc-mascot').src = (this.mascot ||= paintMascot().c.toDataURL());
    const nav = el.querySelector('.p-menu');
    const items = ITEMS.map((it, i) => {
      const b = menuItem(it.label, it.ja, { size: 16 });
      b.style.setProperty('--ix', `${-i * 18}px`);
      b.style.setProperty('--n', i);
      nav.appendChild(b);
      return b;
    });
    el.addEventListener('click', (e) => { if (e.target.classList.contains('p-wash')) this.close(); });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    this.list = new MenuList(items, { onPick: (i) => this.pick(ITEMS[i].id), onBack: () => this.close() });
  }
  chapter() {
    const id = this.game.state.chapter;
    const i = Math.max(0, CHAPTERS.findIndex((c) => c.id === id));
    return { ...CHAPTERS[i], n: i + 1 };
  }
  cardHTML() {
    const g = this.game, ch = this.chapter(), L = g.location;
    const day = L?.day;
    const place = PLACES[L?.id] || '';
    const h = L?.hourOverride ?? g.hour;
    const clock = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 12) * 5).padStart(2, '0')}`;
    const dayRow = ch.day != null ? (() => { const [en, ja] = weekday(ch.day); return `<div class="pc-day"><span class="pc-wd">${ja}</span><em>${en}</em>${day ? `<b>${clock}</b>` : ''}</div>`; })() : '';
    const stats = day ? `<div class="pc-stats"><span><i>¥</i>${day.yen.toLocaleString('en-US')}</span><span><i class="h">★</i>${day.happiness}</span></div>` : '';
    return `<img class="pc-mascot" alt="">
      <div class="pc-tag">CHAPTER ${String(ch.n).padStart(2, '0')}<span>${esc(ch.ja)}</span></div>
      <div class="pc-title"></div>
      ${place ? `<div class="pc-place"><i></i>${esc(place)}</div>` : ''}
      ${dayRow}${stats}`;
  }
  async pick(id) {
    const g = this.game;
    if (id === 'resume') { this.close(); return; }
    sfx('uiConfirm', { volume: 0.45 });
    this.list.enabled = false;
    this.el.classList.add('dim');
    if (id === 'settings') await openSettings(g.settings);
    else if (id === 'chapters') {
      const to = await openChapters(g.state.chapter);
      if (to) { this.leave(`?chapter=${encodeURIComponent(to)}`); return; }
    } else if (id === 'title') {
      const ok = await confirmBox('TO TITLE?', 'Return to the title screen?<br>Next time you <b>Continue</b>, this chapter starts again from its beginning.', { yes: 'YES', no: 'NO' });
      if (ok) { this.leave(location.pathname); return; }
    }
    this.el?.classList.remove('dim');
    if (this.list) this.list.enabled = true;
  }
  // wipe away and reload into the title / another chapter
  leave(url) {
    this.list?.close();
    shutter(() => { location.href = url; return new Promise(() => {}); });
  }
  close() {
    if (!this.el || this.el.classList.contains('out')) return;
    const el = this.el;
    this.list?.close();
    this.list = null;
    sfx('uiClose', { volume: 0.5 });
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => { el.remove(); if (this.el === el) this.el = null; this.game.setPaused(false); }, 230);
  }
}
