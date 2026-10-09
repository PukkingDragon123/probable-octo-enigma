// All playable locations, built lazily the first time they're visited.
import { TrainLocation } from './train.js';
import { PlatformLocation } from './platform.js';

export function registerLocations(game) {
  game.register('train', (g) => new TrainLocation(g));
  game.register('platform', (g) => new PlatformLocation(g));
}
