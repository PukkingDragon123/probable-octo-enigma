import './ui/base.css';
import { loadFonts } from './ui/fonts.js';
import { Game } from './game/Game.js';
import { Phone } from './ui/phone.js';
import { TitleScreen } from './ui/title.js';
import { hasSave } from './game/state.js';
import { registerLocations } from './locations/index.js';
import { Story } from './story/story.js';

await loadFonts();
const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
const game = new Game(canvas, ui);
game.phone = new Phone(game, ui);
registerLocations(game);
game.story = new Story(game);
game.resize();
addEventListener('resize', () => game.resize());
addEventListener('orientationchange', () => setTimeout(() => game.resize(), 200));
game.start();

const params = new URLSearchParams(location.search);
const startChapter = params.get('chapter');
if (startChapter) {
  game.story.start(startChapter);
} else {
  // title: the train speeding through the fields at golden hour behind the logo
  await game.story.titleBackdrop();
  new TitleScreen(ui, {
    hasSave: hasSave(),
    onStart: (choice) => {
      game.audio?.unlock?.();
      if (choice === 'continue' && game.load()) game.story.resume();
      else game.story.start('train');
    },
  });
}
window.__step = (s) => game.step(s);
