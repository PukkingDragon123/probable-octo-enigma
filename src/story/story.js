// Story runner: chapters in order, each an async script using the Director.
// state.chapter remembers where to resume.
import { trainChapter, trainTitleBackdrop } from './ch1_train.js';
import { stationChapter } from './ch2_station.js';
import { walkChapter } from './ch3_walk.js';
import { shopChapter } from './ch4_shop.js';
import { roomChapter } from './ch5_room.js';
import { bendysChapter } from './ch6_bendys.js';
import { night1Chapter } from './ch7_night1.js';
import { day1Chapter } from './ch8_day1.js';

const ORDER = ['train', 'station', 'walk', 'shop', 'room', 'bendys', 'night1', 'day1', 'portal', 'spirit1', 'free'];

export class Story {
  constructor(game) {
    this.game = game;
    this.chapters = { train: trainChapter, station: stationChapter, walk: walkChapter, shop: shopChapter, room: roomChapter, bendys: bendysChapter, night1: night1Chapter, day1: day1Chapter };
  }
  register(id, fn) { this.chapters[id] = fn; }
  async titleBackdrop() { await trainTitleBackdrop(this.game); }
  async start(id) {
    const g = this.game;
    g.state.chapter = id;
    let i = ORDER.indexOf(id);
    if (i < 0) i = 0;
    for (; i < ORDER.length; i++) {
      const ch = ORDER[i];
      const fn = this.chapters[ch];
      if (!fn) { console.warn('chapter not written yet:', ch); break; }
      g.state.chapter = ch;
      g.save();
      await fn(g);
    }
  }
  resume() { this.start(this.game.state.chapter || 'train'); }
}
