// Captions and title cards, Persona-style:
//   place     an ink band slams in from the left with the name in big painted type
//   subtitle  a slanted ink bar at the bottom (announcements, calls)
//   thought   an indigo cloud box (inner voice)
//   phone     a chat message sliding in at the top right ("Mom: ...")
//   narration a plain ink bar
// D.title('Day 2', ...) becomes a calendar page: the week strip ticks over,
// the old day number flips away and the new one slams down.
// Every timing runs on game time, so pausing or skipping holds / speeds them.
import './cards.css';
import { esc } from '../core/util.js';
import { typeEl, CREAM, RED } from './pixtype.js';
import { weekday, WEEKDAYS } from './chapters.js';
import { sfx } from './menu.js';

const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
const DAY = /^Day (\d+)$/;

// integer pixel scale that fits painted type into maxW css px
function fitScale(img, maxW, max = 3) {
  const w = +img.width || 1;
  // whole steps, half steps when it's tight (small phones)
  const s = Math.max(1, Math.min(max, maxW / w >= 2 ? Math.floor(maxW / w) : Math.floor((maxW / w) * 2) / 2));
  img.style.width = w * s + 'px';
  img.style.height = img.height * s + 'px';
  return s;
}

export class Captions {
  constructor(root, game = null) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.className = 'captions';
    root.appendChild(this.el);
    this.top = document.createElement('div');
    this.top.className = 'captions-top';
    root.appendChild(this.top);
  }
  wait(s) { return this.game ? this.game.director.wait(s) : new Promise((r) => setTimeout(r, s * 1000)); }
  async show(text, { dur = 3, kind = 'narration' } = {}) {
    const c = document.createElement('div');
    c.className = 'caption c-' + kind;
    let host = this.el;
    if (kind === 'place') { host = this.top; this.place(c, text); }
    else if (kind === 'phone') { host = this.top; this.phone(c, text); }
    else c.innerHTML = `<i class="c-bg"></i><span class="c-txt">${esc(text).replace(/\*(.+?)\*/g, '<b>$1</b>')}</span>`;
    host.appendChild(c);
    await raf();
    c.classList.add('in');
    if (kind === 'place') sfx('uiSlam', { volume: 0.35 });
    else if (kind === 'phone') this.game?.audio?.play?.('notify', { volume: 0.4 });
    await this.wait(dur);
    c.classList.remove('in'); c.classList.add('out');
    await this.wait(0.4);
    c.remove();
  }
  place(c, text) {
    const m = DAY.exec(text);
    const label = m ? `DAY ${m[1]}` : text;
    c.innerHTML = '<i class="cp-gold"></i><i class="cp-band"></i><i class="cp-red"></i><span class="cp-tag"><i></i><i></i><i></i></span><span class="cp-name"></span>';
    const img = typeEl(label, { size: 14, outline2: null, shadow: 2, shadowColor: RED });
    const maxW = Math.min(innerWidth * 0.84, 1100);
    c.style.setProperty('--s', fitScale(img, maxW));
    c.querySelector('.cp-name').appendChild(img);
    if (m) {
      const [en, ja] = weekday(+m[1]);
      const wd = document.createElement('span');
      wd.className = 'cp-wd';
      wd.innerHTML = `<b>${ja}</b>${en}`;
      c.querySelector('.cp-name').appendChild(wd);
    }
  }
  phone(c, text) {
    const i = text.indexOf(':');
    const from = i > 0 && i < 16 ? text.slice(0, i) : '';
    const msg = i > 0 && i < 16 ? text.slice(i + 1).trim() : text;
    c.innerHTML = `<span class="cph-ava">${esc((from || '?')[0])}</span><span class="cph-box"><b class="cph-from">${esc(from || 'Message')}</b><span class="cph-msg">${esc(msg)}</span></span>`;
  }
}

// ---------------------------------------------------------------- title cards
export async function titleCard(game, text, sub = '', dur = 2.6) {
  const D = game.director;
  const m = DAY.exec(text);
  const el = document.createElement('div');
  el.className = 'tcard' + (m ? ' cal' : '');
  if (m) {
    const n = +m[1];
    const [en, ja] = weekday(n);
    const today = ((n % 7) + 7) % 7;
    const week = WEEKDAYS.map(([e, j], k) => `<span class="d${k}${k === today ? ' now' : ''}" style="--k:${k}"><b>${j}</b>${e}</span>`).join('');
    el.innerHTML = `<i class="tc-wash"></i><i class="tc-band"></i><i class="tc-band2"></i>
      <div class="tc-cal">
        <div class="tc-week">${week}</div>
        <div class="tc-page"><span class="tc-dl">DAY</span><div class="tc-num"></div><span class="tc-wd"><b>${ja}</b>${en}</span></div>
      </div>
      ${sub ? `<div class="tc-sub"><span>${esc(sub)}</span></div>` : ''}`;
    const num = el.querySelector('.tc-num');
    const old = typeEl(String(Math.max(0, n - 1)), { size: 40, slant: 0.1, shadow: 4, shadowColor: RED, outline2: CREAM }, null, 'tc-old');
    const now = typeEl(String(n), { size: 40, slant: 0.1, shadow: 4, shadowColor: RED, outline2: CREAM }, null, 'tc-new');
    num.append(old, now);
  } else {
    el.innerHTML = `<i class="tc-wash"></i><i class="tc-band"></i><i class="tc-band2"></i><div class="tc-main"></div>${sub ? `<div class="tc-sub"><span>${esc(sub)}</span></div>` : ''}`;
    const img = typeEl(text, { size: 22, shadow: 3, shadowColor: RED, outline2: CREAM });
    fitScale(img, Math.min(innerWidth * 0.86, 1100), 4);
    el.querySelector('.tc-main').appendChild(img);
  }
  game.uiRoot.appendChild(el);
  await raf();
  el.classList.add('in');
  sfx('uiOpen', { volume: 0.35 });
  setTimeout(() => sfx('uiSlam', { volume: 0.5 }), m ? 620 : 260);
  await D.wait(dur);
  el.classList.remove('in'); el.classList.add('out');
  sfx('uiClose', { volume: 0.3 });
  await D.wait(0.6);
  el.remove();
}
