// All playable locations, built lazily the first time they're visited.
import { TrainLocation } from './train.js';
import { PlatformLocation } from './platform.js';
import { GinzaLocation } from './ginza.js';
import { KodamayaLocation } from './kodamaya.js';
import { MamoRoomLocation } from './mamoroom.js';
import { BendysLocation } from './bendys.js';
import { SpiritLocation } from './spirit.js';

export function registerLocations(game) {
  game.register('train', (g) => new TrainLocation(g));
  game.register('platform', (g) => new PlatformLocation(g));
  game.register('ginza', (g) => new GinzaLocation(g));
  game.register('kodamaya', (g) => new KodamayaLocation(g));
  game.register('mamoroom', (g) => new MamoRoomLocation(g));
  game.register('bendys', (g) => new BendysLocation(g));
  game.register('spirit', (g) => new SpiritLocation(g));
}
