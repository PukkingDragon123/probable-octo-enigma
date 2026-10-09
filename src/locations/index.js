// All playable locations, built lazily the first time they're visited.
import { TrainLocation } from './train.js';

export function registerLocations(game) {
  game.register('train', (g) => new TrainLocation(g));
}
