// In-play HUD, all in the menus' language:
//   - top right: the MENU tab (opens the pause menu) and, in cutscenes, a
//     hold-to-skip tab (same as holding Shift)
//   - cinematic bars get a vermilion edge that draws in with the letterbox
//   - shop days: a Persona-style calendar block (day, weekday, clock) with the
//     register's takings and the Happiness count
//   - mouse hover over something usable shows its name on a slanted tag
// Runs on its own animation frame (keeps updating while the game is paused)
// and only touches the DOM when a value changes.
import './hud.css';
import { typeEl, CREAM, RED } from './pixtype.js';
import { kbd, isTouch, sfx } from './menu.js';
import { CHAPTERS, weekday } from './chapters.js';

const hhmm = (h) => { const m = Math.floor((h % 1) * 60); return `${String(Math.floor(h)).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`; };
const partOfDay = (h) => (h < 11 ? 'MORNING' : h < 13 ? 'NOON' : h < 17 ? 'AFTERNOON' : 'EVENING');

export class Hud {
  constructor(game, root) {
    this.game = game;
    this.on = true;
    const el = (this.el = document.createElement('div'));
    el.className = 'hud';
    const touch = isTouch();
    el.innerHTML = `
      <i class="hud-lb top"></i><i class="hud-lb bot"></i>
      <div class="hud-tr">
        <button class="hud-skip" aria-label="Hold to skip"><i class="hs-fill"></i><span class="hs-ico"><i></i><i></i></span><span class="hs-t">SKIP</span>${touch ? '' : `<span class="hs-k">${kbd('Shift')}</span>`}</button>
        <button class="hud-menu" aria-label="Menu"><span class="hm-ico"><i></i><i></i></span><span class="hm-t">MENU</span>${touch ? '' : `<span class="hm-k">${kbd('Esc')}</span>`}</button>
      </div>
      <div class="hud-day">
        <div class="hd-cal"><span class="hd-dl">DAY</span><span class="hd-num"></span><span class="hd-wd"><b></b><em></em></span></div>
        <div class="hd-time"><b class="hd-clock">10:00</b><span class="hd-part">MORNING</span></div>
        <div class="hd-stats"><span class="hd-yen"><i>¥</i><b>0</b></span><span class="hd-hap"><i>★</i><b>0</b></span></div>
      </div>
      <div class="hud-tag"><span></span></div>`;
    root.appendChild(el);
    this.$ = (s) => el.querySelector(s);
    this.lbTop = this.$('.hud-lb.top'); this.lbBot = this.$('.hud-lb.bot');
    this.tr = this.$('.hud-tr');
    this.skipBtn = this.$('.hud-skip');
    this.dayEl = this.$('.hud-day');
    this.tag = this.$('.hud-tag');
    this.vals = {};
    // menu button
    this.$('.hud-menu').addEventListener('click', (e) => { e.stopPropagation(); this.game.pause?.open(); });
    this.$('.hud-menu').addEventListener('pointerdown', (e) => e.stopPropagation());
    // hold to skip
    const sk = this.skipBtn;
    const start = (e) => { e.preventDefault(); e.stopPropagation(); if (!this.game.director.inCutscene || this.game.paused) return; this.game.director.skipping = true; sk.classList.add('held'); sfx('uiTick', { volume: 0.4 }); };
    const stop = () => { if (sk.classList.contains('held')) { sk.classList.remove('held'); this.game.director.skipping = false; } };
    sk.addEventListener('pointerdown', start);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) sk.addEventListener(ev, stop);
    sk.addEventListener('click', (e) => e.stopPropagation());
    const loop = () => { try { this.update(); } catch (e) { console.error(e); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  set(k, v, fn) { if (this.vals[k] !== v) { this.vals[k] = v; fn(v); return true; } return false; }
  update() {
    const g = this.game, D = g.director, L = g.location;
    const on = this.on && !g.paused;
    this.set('on', on, (v) => this.el.classList.toggle('off', !v));
    // letterbox edges (the renderer draws the bars: 11.5% of the height each)
    const lb = Math.round(g.letterbox * 1000) / 1000;
    this.set('lb', lb, (v) => {
      const h = v * 11.5;
      this.lbTop.style.height = this.lbBot.style.height = h + 'vh';
      this.lbTop.style.opacity = this.lbBot.style.opacity = v > 0.02 ? 1 : 0;
      this.lbTop.style.setProperty('--k', v); this.lbBot.style.setProperty('--k', v);
    });
    // skip tab only in cutscenes
    const cut = on && D.inCutscene && !g.autoPlay;
    this.set('cut', cut, (v) => this.skipBtn.classList.toggle('show', v));
    this.set('skipping', !!D.skipping, (v) => this.skipBtn.classList.toggle('ff', v));
    // shop calendar
    const day = L?.day;
    const ch = CHAPTERS.find((c) => c.id === g.state.chapter);
    const dn = ch?.day ?? null;
    const showDay = on && !!day && dn != null && !D.inCutscene;
    this.set('showDay', showDay, (v) => { this.dayEl.classList.toggle('show', v); document.body.classList.toggle('hud-day-on', v); });
    if (day && dn != null) {
      this.set('dn', dn, (n) => {
        const num = this.$('.hd-num');
        num.innerHTML = '';
        num.appendChild(typeEl(String(n), { size: 22, slant: 0.12, shadow: 2, shadowColor: RED, outline2: CREAM }));
        const [en, ja] = weekday(n);
        this.$('.hd-wd b').textContent = ja; this.$('.hd-wd em').textContent = en;
      });
      const h = L.hourOverride ?? g.hour;
      this.set('clock', hhmm(h), (v) => { this.$('.hd-clock').textContent = v; });
      this.set('part', partOfDay(h), (v) => { this.$('.hd-part').textContent = v; });
      this.set('yen', day.yen, (v) => { this.$('.hd-yen b').textContent = v.toLocaleString('en-US'); this.bump('.hd-yen'); });
      this.set('hap', day.happiness, (v) => { this.$('.hd-hap b').textContent = v; this.bump('.hd-hap'); });
    }
    // hover tag (mouse only)
    const it = !g.inputLocked && on && g.hoverIt;
    const label = it && (it.label || (it.char?.introduced && it.char.name)) || '';
    this.set('tag', label, (v) => { this.tag.querySelector('span').textContent = v; this.tag.classList.toggle('show', !!v); if (v) { this.tag.classList.remove('pop'); void this.tag.offsetWidth; this.tag.classList.add('pop'); } });
    if (label) this.tag.style.transform = `translate(${Math.round(g.input.hoverX + 18)}px, ${Math.round(g.input.hoverY - 46)}px)`;
  }
  bump(sel) { const e = this.$(sel); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
}
