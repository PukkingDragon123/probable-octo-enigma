// Mamo's phone: the game's one piece of "UI", always held in-world. It slides
// up as a pixel-art handset with apps: lock screen, music player, messages,
// photos, and later Cameri (the second-hand market) and the shop ledger.
import './phone.css';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { esc } from '../core/util.js';

const pix = (p) => p.c.toDataURL();

// ---- painted images
function albumArt() {
  const p = new PixCanvas(48, 48, 5);
  for (let y = 0; y < 48; y++) p.hline(0, 47, y, mix('#2a3a6a', '#e89a8a', y / 47));
  p.circle(34, 30, 8, '#ffd8a0');
  for (let i = 0; i < 26; i++) p.vline((i * 13) % 48, (i * 7) % 20, (i * 7) % 20 + 6, '#a8c0e8');
  p.rect(0, 38, 48, 10, '#1a2040');
  p.rect(6, 34, 6, 6, '#1a2040'); p.rect(14, 30, 8, 10, '#1a2040'); p.rect(26, 33, 5, 7, '#1a2040');
  p.px(8, 36, '#ffd890'); p.px(17, 33, '#ffd890'); p.px(19, 36, '#ffd890');
  return pix(p);
}
// a photo of Mamo and his dad fishing at a river (pixel painting)
export function dadPhoto() {
  const p = new PixCanvas(96, 72, 7);
  for (let y = 0; y < 40; y++) p.hline(0, 95, y, mix('#8ac0f0', '#f0e0c0', y / 40));
  p.ellipse(70, 14, 9, 9, '#fff4c8');
  for (let x = 0; x < 96; x++) p.vline(x, 30 - Math.round(Math.sin(x * 0.07) * 4 + 4), 40, '#6a9a5a');
  for (let y = 40; y < 72; y++) p.hline(0, 95, y, mix('#5a9ac8', '#3a6a9a', (y - 40) / 32));
  for (let i = 0; i < 20; i++) p.hline((i * 23) % 90, (i * 23) % 90 + 5, 44 + (i * 7) % 26, '#a8d0f0');
  // the bank
  p.poly([[0, 52], [44, 48], [60, 72], [0, 72]], '#8a7a4a');
  // dad (big turtle, fishing rod, hat) and little mamo
  const sk = '#7a9a58', skL = '#a8c080';
  p.ellipse(22, 42, 7, 7, '#6a5232'); p.ellipse(22, 34, 6, 5.5, sk); p.rect(15, 28, 14, 3, '#d8b860'); p.rect(18, 25, 8, 3, '#d8b860');
  p.px(20, 34, '#1a1410'); p.px(25, 34, '#1a1410'); p.hline(21, 24, 37, '#3a2a20');
  p.rect(17, 43, 10, 8, '#c84a3a'); p.line(27, 44, 52, 22, '#5a3a2a'); p.line(52, 22, 54, 50, '#e8e8e8');
  p.ellipse(36, 46, 5, 5, '#6a5232'); p.ellipse(36, 40, 4.5, 4, '#94bf6c'); p.px(34, 40, '#1a1410'); p.px(38, 40, '#1a1410');
  p.hline(35, 37, 42, '#3a2a20'); p.px(34, 42, '#3a2a20'); p.px(38, 42, '#3a2a20');
  p.rect(32, 46, 8, 6, '#4c5b84');
  p.rect(41, 50, 8, 4, '#c8a050'); // the bucket
  // photo grain + date stamp
  p.text("'21 7 18", 93, 66, { font: '8px Galmuri7', color: '#ff9a3a', align: 'right' });
  return pix(p);
}
function wallpaper() {
  const p = new PixCanvas(90, 160, 9);
  for (let y = 0; y < 160; y++) p.hline(0, 89, y, mix('#1a2244', '#3a4a7a', y / 160));
  for (let i = 0; i < 40; i++) p.px((i * 37) % 90, (i * 53) % 110, i % 3 ? '#8a9ad8' : '#ffffff');
  p.circle(64, 30, 10, '#f4f0d8'); p.circle(60, 27, 9, '#1a2244');
  return pix(p);
}

export class Phone {
  constructor(game, root) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.className = 'phone';
    this.el.innerHTML = `<div class="ph-body"><div class="ph-notch"></div><div class="ph-screen"><div class="ph-status"><span class="ph-time">15:24</span><span class="ph-icons"><i></i><i></i><i></i><b></b></span></div><div class="ph-app"></div></div><div class="ph-home"></div></div>`;
    root.appendChild(this.el);
    this.app = this.el.querySelector('.ph-app');
    this.timeEl = this.el.querySelector('.ph-time');
    this.open = false;
    this.messages = [];
    this.track = { title: 'rain on the window', artist: 'lofi tide', len: 182, t: 31 };
    this.art = albumArt();
    this.wall = wallpaper();
    this.el.querySelector('.ph-home').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.home(); });
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.screen = 'lock';
    this.onClose = null;
  }
  setTime(str) { this.timeEl.textContent = str; }
  show(screen = 'music', { compact = false } = {}) {
    this.el.classList.toggle('compact', compact);
    this.el.classList.add('open');
    this.open = true;
    this.go(screen);
    this.game.audio?.play?.('phoneTap', { volume: 0.4 });
  }
  hide() { this.el.classList.remove('open'); this.open = false; this.onClose && this.onClose(); }
  home() { this.go('home'); }
  go(screen) {
    this.screen = screen;
    const A = this.app;
    A.className = 'ph-app app-' + screen;
    if (screen === 'lock') {
      A.innerHTML = `<img class="ph-wall" src="${this.wall}"><div class="ph-lockclock">${this.timeEl.textContent}</div><div class="ph-lockdate">Thursday · cloudy</div>${this.messages.slice(-2).map((m) => `<div class="ph-notif"><b>${esc(m.from)}</b> ${esc(m.text)}</div>`).join('')}`;
    } else if (screen === 'music') {
      const T = this.track, p = Math.min(1, T.t / T.len);
      const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      A.innerHTML = `<div class="ph-title">Now playing</div><img class="ph-art" src="${this.art}"><div class="ph-song">${esc(T.title)}</div><div class="ph-artist">${esc(T.artist)} · playlist: <i>don't talk to me</i></div><div class="ph-bar"><div style="width:${p * 100}%"></div></div><div class="ph-times"><span>${mm(T.t)}</span><span>-${mm(T.len - T.t)}</span></div><div class="ph-ctrl"><span>|&lt;&lt;</span><span>||</span><span>&gt;&gt;|</span></div><div class="ph-queue">up next: <b>empty seat</b> · <b>static</b> · <b>the long way home</b></div>`;
    } else if (screen === 'messages') {
      A.innerHTML = `<div class="ph-title">Mom</div><div class="ph-thread">${this.messages.map((m) => `<div class="ph-msg ${m.me ? 'me' : ''}">${esc(m.text)}</div>`).join('')}${this.typing ? `<div class="ph-msg me typing">${esc(this.typing)}<span class="caret">|</span></div>` : ''}</div>`;
      const th = A.querySelector('.ph-thread'); th.scrollTop = th.scrollHeight;
    } else if (screen === 'photo') {
      A.innerHTML = `<div class="ph-title">Photos · Summer</div><img class="ph-photo" src="${dadPhoto()}"><div class="ph-caption">Dad caught nothing. I caught one. He was so proud.</div>`;
    } else if (screen === 'home') {
      A.innerHTML = `<img class="ph-wall" src="${this.wall}"><div class="ph-grid">${[['music', '♪', 'Music'], ['messages', '✉', 'Mom'], ['photo', '▣', 'Photos'], ['cameri', 'C', 'Cameri'], ['ledger', '¥', 'Ledger'], ['close', '×', 'Close']].map(([k, ic, n]) => `<button data-k="${k}" class="ph-ico ico-${k}"><span>${ic}</span><em>${n}</em></button>`).join('')}</div>`;
      A.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); const k = b.dataset.k; if (k === 'close') this.hide(); else if (this.apps?.[k]) this.apps[k](this); else this.go(k); this.game.audio?.play?.('phoneTap', { volume: 0.4 }); }));
    } else if (this.apps?.[screen]) this.apps[screen](this);
  }
  // add a message (from someone else) with the buzz
  receive(from, text) {
    this.messages.push({ from, text, me: false });
    this.game.audio?.play?.('notification', { volume: 0.5 });
    if (this.open && this.screen === 'messages') this.go('messages');
    if (this.open && this.screen === 'lock') this.go('lock');
  }
  // type a reply letter by letter; `erase` deletes it again (hesitation)
  async type(text, { erase = false, speed = 0.08 } = {}) {
    const D = this.game.director;
    this.typing = '';
    for (const ch of text) { this.typing += ch; this.go('messages'); this.game.audio?.play?.('phoneTap', { volume: 0.25 }); await D.wait(speed); }
    await D.wait(0.5);
    if (erase) {
      while (this.typing.length) { this.typing = this.typing.slice(0, -1); this.go('messages'); await D.wait(0.04); }
      this.typing = null; this.go('messages');
      return;
    }
    this.messages.push({ from: 'me', text, me: true });
    this.typing = null;
    this.go('messages');
  }
  update(dt) {
    if (this.open && this.screen === 'music') {
      this.track.t += dt;
      if (this.track.t > this.track.len) this.track.t = 0;
      this._acc = (this._acc || 0) + dt;
      if (this._acc > 1) { this._acc = 0; this.go('music'); }
    }
  }
}
