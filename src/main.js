import './ui/base.css';
import { loadFonts } from './ui/fonts.js';
import { Game } from './game/Game.js';
import { Phone } from './ui/phone.js';
import { FirstPerson } from './game/firstPerson.js';
import { RotateButtons } from './ui/rotateButtons.js';
import { TitleScreen } from './ui/title.js';
import { setMenuAudio } from './ui/menu.js';
import { Hud } from './ui/hud.js';
import { PauseMenu } from './ui/pause.js';
import { hasSave } from './game/state.js';
import { registerLocations } from './locations/index.js';
import { Story } from './story/story.js';

await loadFonts();
const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
const game = new Game(canvas, ui);
setMenuAudio(game.audio);
game.phone = new Phone(game, ui);
game.fp = new FirstPerson(game);
game.rotBtns = new RotateButtons(game, ui);
game.hud = new Hud(game, ui);
game.pause = new PauseMenu(game);
registerLocations(game);
game.story = new Story(game);
game.resize();
addEventListener('resize', () => game.resize());
addEventListener('orientationchange', () => setTimeout(() => game.resize(), 200));
game.start();

const params = new URLSearchParams(location.search);
if (params.get('ff')) game.fastForward = +params.get('ff'); // dev: run game time faster
if (params.get('skip')) game.director.skipUntil = params.get('skip'); // dev: jump to a beat
if (params.get('auto')) game.autoPlay = true; // dev: tutorials play themselves
const startChapter = params.get('chapter');
const viewLoc = params.get('loc');
if (viewLoc) {
  // dev: open a location with the player standing in it (free walk)
  const L = await game.goTo(viewLoc, {}, { transition: null });
  const p = (params.get('at') || '').split(',').map(Number);
  game.place(game.player, p[0] || 0, p[1] || 2, 0);
  if (L.camCfg.fixed) game.director.follow(game.player); else game.rig.setFollow(game.player);
  if (params.get('hour')) game.state.hour = +params.get('hour');
} else if (startChapter) {
  game.story.start(startChapter);
} else {
  // title: the train speeding through the fields at golden hour behind the logo
  game.hud.on = false;
  await game.story.titleBackdrop();
  new TitleScreen(ui, {
    hasSave: hasSave(),
    settings: game.settings,
    onStart: (choice) => {
      game.renderer.uniforms.fade.value = 1; // every chapter fades in from black
      game.hud.on = true;
      game.audio?.unlock?.();
      if (choice === 'continue' && game.load()) game.story.resume();
      else game.story.start('train');
    },
  });
}
window.__step = (s) => game.step(s);
if (import.meta.env?.DEV) window.__game = game;
