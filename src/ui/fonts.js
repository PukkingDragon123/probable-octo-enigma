// Fonts: Galmuri pixel fonts (OFL) for dialogue / labels, and a set of OFL
// Japanese display fonts used to paint posters, signs and packaging onto
// textures. tools/fonts/build_fonts.py subsets them to the glyphs we use.
import '../assets/fonts/gen/fonts.css';
import FAMILIES from '../assets/fonts/gen/families.json';

export const FONT = {
  ui: 'Galmuri11',
  small: 'Galmuri9',
  tiny: 'Galmuri7',
  big: 'Galmuri14',
  // display
  bold: 'Dela Gothic One',
  round: 'RocknRoll One',
  pop: 'Mochiy Pop One',
  dot: 'DotGothic16',
  outline: 'Rampart One',
  brush: 'Yusei Magic',
  cute: 'Hachi Maru Pop',
  chunky: 'Potta One',
  wild: 'Reggae One',
};

// Wait for every family (with a sample of Latin + Japanese) so canvas painting
// never falls back to a system font. Resolves even if loading fails.
export async function loadFonts(timeoutMs = 6000) {
  if (!document.fonts) return;
  const sample = 'Aa1あア木霊屋';
  const jobs = [];
  for (const fam of FAMILIES) {
    for (const wt of fam.startsWith('Galmuri11') ? ['400', '700'] : ['400']) jobs.push(document.fonts.load(`${wt} 16px "${fam}"`, sample).catch(() => null));
  }
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, timeoutMs))]);
}
