// Chapter 3 — down Kodama Ginza.
// Dusk. Out of the station, across the square past the koban and the town's
// mascot statue, over the crossing (wait for the chirping green man), then
// under the arcade. Grandpa walks Mamo from the station gate to Kodamaya,
// and everyone on the street has something to say: Anaguma-jii presses a hot
// sweet potato on him, Shibata-san waves from the café, Ponta bellows across
// the street, Grandpa goes quiet in front of the toy shop that closed. At the
// end, kids crowding the dusty gacha machines, the faded sign, and a
// maneki-neko that — just for a second — seems to wave.
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { duffel } from '../world/props.js';
import { phoneMesh } from '../entities/parts.js';
import { VoxelModel, vm, fill, V25 } from '../world/build.js';
import { PLAZA } from '../locations/ginza.js';

const LANE = 3.65; // the pair walks down the middle carpet

function sweetPotato() {
  const v = new VoxelModel();
  for (let x = -4; x <= 4; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) if ((x / 4.5) ** 2 + (y / 2.4) ** 2 + (z / 2.4) ** 2 <= 1) v.set(x, y, z, Math.abs(x) > 2 ? 0x8a3a5a : y > 0 ? 0xf0c040 : 0xa84a6a);
  fill(v, -2, 2, -3, -3, -3, 3, 0xe8e0d0); // newspaper wrap
  return vm(v, V25, [0.5, 0.5, 0.5]);
}

export async function walkChapter(g) {
  const D = g.director;
  const later = (sec, fn) => D.wait(sec).then(fn);
  const L = await g.goTo('ginza', { camX: -76 }, { transition: null });
  const P = g.player, C = L.crowd, S = L.shops;
  const sx = (k, dx = 0) => S[k].position.x + dx;
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    g.audio?.music?.('street');
    // ---- cast: Mamo (hood up, bag, phone) and Grandpa, just inside the station doors
    const door = L.stationDoor;
    g.place(P, door.x + 0.35, -0.75, 0);
    P.setHood(true);
    P.setExpr('hollow', { react: false });
    P.stopAction();
    P.hold(duffel(0x4c5b84), 'L');
    P.hold(phoneMesh(), 'R');
    const G = new Character(CHARACTERS.genzo);
    L.add(G);
    G.setPos(door.x - 0.45, -0.95); G.faceNow(0);
    G.setExpr('happy', { react: false });
    // Grandpa leads, a step ahead; Mamo trails along the same waypoints
    const duo = async (pts, { gdx = 0.7, gdz = -0.45, pdz = 0 } = {}) => {
      const gp = (async () => { for (const q of pts) await G.walkTo(q.x + gdx, q.z + gdz); })();
      await D.walkPath(P, pts.map((q) => ({ x: q.x, z: q.z + pdz })));
      await gp;
    };
    // ---- establishing: the station at dusk, the square, the taxis waiting
    D.cam({ x: door.x + 1.5, y: 2.6, z: 2.4, wupp: 0.021, pitch: 26, yaw: 0, dur: 0 });
    await D.fadeIn(1.8);
    D.caption('Kodama-machi Station Square', { dur: 3.4, kind: 'place' });
    D.cam({ x: door.x + 4.5, y: 1.9, z: 2.6, wupp: 0.0175, pitch: 27, dur: 6, ease: 'inOutSine' });
    // out through the glass doors into the warm evening
    await duo([{ x: door.x + 0.35, z: 1.6 }, { x: door.x + 2.2, z: 2.45 }], { gdx: 0.55, gdz: -0.3 });
    P.play('phone', { loop: true, scroll: true });
    D.mark('square');
    D.follow(P, { wupp: 0.0158 });
    // the officer outside the koban calls out
    const cop = L.locals.koban?.c;
    const copWave = duo([{ x: -68.6, z: 2.45 }, { x: -66.6, z: 3.2 }]);
    await D.wait(1.6);
    if (cop) { cop.faceTo(G.x, G.z); cop.play('wave'); D.say(cop, 'Genzō-san! Evening! Is this the grandson?', { expr: 'happy', auto: 1.8, name: 'Inuyama-san' }); }
    await copWave;
    G.faceTo(cop?.x ?? G.x, cop?.z ?? 0); G.play('wave');
    await D.say(G, "Evening, Inuyama-kun! Mamoru — he's staying the summer.", { expr: 'laugh' });
    P.stopAction(); if (cop) P.faceTo(cop.x, cop.z); P.play('bow');
    await D.wait(0.9);
    // ---- the statue: Kodama-kun in his knitted bib
    D.mark('statue');
    const SX = PLAZA.statue.x, SZ = PLAZA.statue.z;
    await duo([{ x: SX - 2.0, z: 5.2 }, { x: SX + 1.0, z: SZ + 1.15 }], { gdx: -2.05, gdz: -0.35 });
    G.faceTo(SX, SZ); P.faceTo(SX, SZ);
    await D.cam({ x: SX, y: 1.15, z: SZ + 0.5, wupp: 0.0102, pitch: 20, dur: 1.6, clip: 2.4 });
    await D.say(G, "And that's Kodama-kun. Guardian of the town — so the posters say.", { expr: 'happy' });
    P.lookAt({ x: SX, y: 1.6, z: SZ }, 1);
    await D.think(P, '(...Why is it wearing a bib?)', { auto: 1.8 });
    G.setExpr('laugh');
    await D.say(G, 'Tsuru-baa knits him a new one every winter. Nobody remembers why.', { expr: 'laugh' });
    P.lookAt(null);
    // ---- the crossing: wait for the little green man
    D.mark('crossing');
    D.follow(P, { wupp: 0.0158 });
    P.play('phone', { loop: true, scroll: true });
    const RX = PLAZA.roadX0;
    await duo([{ x: SX + 4, z: 5.0 }, { x: RX - 0.65, z: 4.3 }], { gdx: 0.35, gdz: -0.55 });
    L.signalT = 18.5; // the cars still have the green
    G.faceYaw(Math.PI / 2); P.faceYaw(Math.PI / 2);
    await D.cam({ x: RX + 0.7, y: 1.0, z: 3.8, wupp: 0.0118, pitch: 24, dur: 1.4, clip: 2 });
    await D.say(G, 'Wait for the little green man.', { expr: 'gentle' });
    for (let i = 0; i < 40 && L.crossing?.ped !== 'go'; i++) await D.wait(0.25);
    await D.wait(0.5);
    P.stopAction();
    D.emote(P, 'note');
    await D.think(P, '(...It chirps.)', { auto: 1.4 });
    P.play('phone', { loop: true, scroll: true });
    D.follow(P, { wupp: 0.0158 });
    await duo([{ x: -36.2, z: 4.0 }, { x: -34.4, z: LANE + 0.15 }], { gdx: 0.6, gdz: -0.45 });
    // ---- under the gate: the long arcade at dusk
    D.cam({ x: -27, y: 2.6, z: 2.2, wupp: 0.024, pitch: 26, yaw: 0, dur: 1.6, ease: 'inOutSine' });
    D.caption('Kodama Ginza Shopping Street', { dur: 3.5, kind: 'place' });
    await D.wait(1.0);
    D.cam({ x: -24, y: 2.0, z: 2.3, wupp: 0.019, pitch: 28, dur: 5, ease: 'inOutSine' });
    // they walk in under the gate
    P.play('phone', { loop: true, scroll: true });
    G.walkTo(-28.8, LANE - 0.3);
    await D.walk(P, -29.6, LANE + 0.15, { free: true });
    await D.wait(0.4);
    D.mark('imo');
    // ---- Anaguma-jii and the sweet potato
    const ana = L.locals.imo.c;
    C.keepOut(-26.6, 5.2, 2.2);
    // the old man shuffles over from his cart to meet them
    ana.walkTo(-26.1, 5.0);
    G.walkTo(-27.2, 4.75);
    await D.walk(P, -27.75, 5.25, { free: true });
    P.stopAction(); P.play('phone', { loop: true });
    ana.faceTo(G.x, G.z); G.faceTo(ana.x, ana.z);
    await D.cam({ x: -26.9, y: 0.8, z: 5.0, wupp: 0.0092, pitch: 20, dur: 1.4, clip: 1.8 });
    ana.play('wave');
    await D.say(ana, "Genzō! That the grandson? Look at the size of him!", { expr: 'joy', name: 'Anaguma-jii' });
    G.faceTo(ana.x, ana.z);
    await D.say(G, "Mamoru, this is Anaguma-san. Best yaki-imo in the prefecture.", { expr: 'happy' });
    P.stopAction();
    P.faceTo(ana.x, ana.z);
    P.play('bow');
    P.setExpr('shy');
    await D.wait(0.9);
    const imo = sweetPotato();
    ana.hold(imo, 'R');
    ana.play('give', { dur: 1.2, onGive: () => { const o = ana.drop('R'); P.drop('R'); P.hold(o, 'R'); } });
    await D.say(ana, "Here. For the walk. On the house!", { expr: 'smile' });
    P.setExpr('surprised');
    D.emote(P, 'excl');
    await D.wait(0.6);
    P.setExpr('shy');
    await D.say(P, '...Thank you.', { expr: 'shy' });
    ana.play('nod');
    G.setExpr('laugh');
    await D.wait(0.5);
    C.keepOut(null);
    // ---- down the street, the camera following along
    D.mark('walk');
    D.follow(P, { wupp: 0.0148 });
    G.walkTo(sx('cafe', 0.6), LANE - 0.3);
    await D.walk(P, sx('cafe', -0.3), LANE + 0.1, { free: true });
    // Shibata-san waves from the café door
    const shib = L.locals.cafe.c;
    shib.stopAction(); shib.faceTo(G.x, G.z); shib.play('wave');
    G.faceTo(shib.x, shib.z);
    D.say(shib, "Genzō-san! Bring the boy for morning toast!", { expr: 'happy', auto: 1.6, name: 'Shibata-san' });
    await D.wait(0.8);
    G.play('wave');
    await D.wait(1.6);
    shib.play('wipe', { loop: true });
    // past the florist; a sparrow hops off the pavement
    G.walkTo(sx('shutterA', 0.4), LANE - 0.3);
    await D.walk(P, sx('shutterA', -0.4), LANE + 0.1, { free: true });
    // ---- the toy shop that closed
    D.mark('toyshop');
    C.keepOut(sx('shutterA'), 2.6, 2.2);
    G.faceYaw(Math.PI);
    G.setExpr('nostalgic');
    await D.cam({ x: sx('shutterA'), y: 1.1, z: 2.6, wupp: 0.0105, pitch: 20, dur: 1.6, clip: 1.8 });
    await D.wait(0.6);
    await D.say(G, "Matsuda's toy shop. Forty years he ran it.", { expr: 'nostalgic' });
    P.faceYaw(Math.PI);
    await D.say(G, '...Shut the shutter last spring and never opened it again.', { expr: 'sad' });
    await D.wait(0.5);
    P.lookAt({ x: sx('shutterA', 0.6), y: 1.2, z: 0 }, 1);
    await D.think(P, '...', { auto: 1.2 });
    G.setExpr('gentle');
    await D.say(G, 'Well! Not us, eh? Come on.', { expr: 'gentle', act: 'pat' });
    P.lookAt(null);
    C.keepOut(null);
    // ---- Ponta bellows from the fish shop
    D.mark('ponta');
    D.follow(P, { wupp: 0.0148 });
    P.play('phone', { loop: true, scroll: true });
    G.walkTo(sx('fish', 0.2), LANE - 0.3);
    await D.walk(P, sx('fish', -1.2), LANE + 0.1, { free: true });
    const pon = L.locals.fish.c;
    pon.faceTo(P.x, P.z);
    pon.play('wave');
    g.audio?.voice?.(pon.def.voice || { pitch: 0.8 }, 'OI!', {});
    D.shake(0.15);
    await D.shout(pon, "OI!! GENZŌ-SAN!! IS THAT THE GRANDSON?!", { expr: 'joy', name: 'Ponta' });
    P.stopAction();
    P.squash(0.3);
    P.setExpr('shocked');
    D.emote(P, 'sweat');
    // everyone on this stretch turns to look
    for (const q of C.people) if (Math.abs(q.c.x - P.x) < 6 && q.c !== pon && (q.mode === 'stand' || q.mode === 'chat')) { q.c.lookAt(P.root, 0.8); later(3.2, () => q.c.lookAt(null)); }
    await D.cam({ x: (P.x + pon.x) / 2, y: 0.9, z: 2.6, wupp: 0.0115, pitch: 22, dur: 1.0, clip: 2.2 });
    G.setExpr('laugh'); G.play('scratchHead');
    await D.say(G, "Ho ho! Keep it down, Ponta, you'll scare the fish!", { expr: 'laugh' });
    await D.say(pon, "Come by tomorrow, kid! I'll set aside the fattest saba for you!", { expr: 'happy', name: 'Ponta' });
    P.setExpr('awkward');
    P.play('handsBack', { loop: true });
    await D.think(P, '(...Please stop looking at me.)', { auto: 1.6 });
    // the students at the drugstore giggle as he goes by
    D.mark('students');
    D.follow(P, { wupp: 0.0148 });
    P.stopAction();
    P.play('phone', { loop: true });
    G.walkTo(sx('drug', 0.8), LANE - 0.3);
    await D.walk(P, sx('drug', -0.3), LANE + 0.1, { free: true });
    const grp = C.groups[0];
    if (grp) { for (const m of grp.members) m.c.lookAt(P.root, 0.9); D.emote(grp.members[0].c, 'heart'); grp.members[1]?.c.play('clap'); later(2.5, () => { for (const m of grp.members) m.c.lookAt(null); }); }
    P.setExpr('shy');
    await D.wait(0.5);
    G.walkTo(sx('books', 0.2), LANE - 0.3);
    await D.walk(P, sx('books', -0.7), LANE + 0.1, { free: true });
    // ---- Kodamaya: kids at the gacha machines
    D.mark('kodamaya');
    const K = S.kodamaya;
    const kids = C.people.filter((q) => q.c.def.role === 'kid' && Math.abs(q.c.x - K.position.x) < 3);
    C.keepOut(K.position.x + 0.4, 2.2, 2.4);
    // they stop beside the machines (east of the kids) so everyone stays in view
    G.walkTo(K.position.x + 1.15, 1.85);
    await D.walk(P, K.position.x + 1.95, 2.35, { free: true });
    P.stopAction();
    G.faceTo(K.position.x - 1.0, 1.2); P.faceTo(K.position.x - 0.8, 1.2);
    await D.cam({ x: K.position.x - 0.35, y: 0.95, z: 1.9, wupp: 0.0112, pitch: 20, dur: 1.6, clip: 2.0 });
    if (kids[0]) {
      await D.say(kids[0].c, 'Ehhh, it\'s closed again...', { expr: 'sad', name: '' });
      kids[0].c.faceTo(G.x, G.z);
      kids[0].c.setExpr('excited');
      D.emote(kids[0].c, 'excl');
      await D.say(kids[0].c, 'Ojii-chan! When are you opening?!', { expr: 'excited', act: 'jump', name: '' });
    }
    G.faceTo(kids[0]?.c.x ?? G.x, kids[0]?.c.z ?? G.z + 1);
    await D.say(G, 'Tomorrow! I\'ve got a helper now.', { expr: 'happy', act: 'point' });
    for (const k of kids) { k.c.faceTo(P.x, P.z); k.c.lookAt(P.root, 1); }
    P.setExpr('surprised');
    D.emote(P, 'interro');
    if (kids[1]) await D.say(kids[1].c, 'Whoa! A turtle! Just like you, Ojii-chan!', { expr: 'excited', act: 'point', name: '' });
    P.setExpr('awkward');
    D.emote(P, 'sweat');
    await D.wait(0.8);
    // the kids scatter off down the street, laughing
    kids.forEach((k, i) => { k.mode = 'still'; k.c.lookAt(null); k.c.walkTo(K.position.x + 4 + i * 0.7, 5.2 + i * 0.5, { run: true }).then(() => k.c.walkTo(ST_END + 2, 5.6, { run: true })); });
    await D.wait(1.2);
    // ---- here we are
    D.mark('arrive');
    G.faceTo(P.x, P.z);
    await D.say(G, 'Well. Here we are.', { expr: 'gentle' });
    G.faceYaw(Math.PI);
    D.cam({ x: K.position.x, y: 1.9, z: 2.6, wupp: 0.0135, pitch: 18, dur: 2.6, ease: 'inOutSine', clip: 0 });
    await D.say(G, 'Kodamaya.', { expr: 'nostalgic' });
    P.faceYaw(Math.PI);
    P.lookAt({ x: K.position.x, y: 2.9, z: 0 }, 1);
    await D.wait(1.0);
    await D.think(P, '...It\'s smaller than I remember.', { auto: 2.0 });
    // the maneki-neko's paw twitches — once
    const mn = K.userData.maneki;
    await D.cam({ x: K.position.x + K.userData.width / 2 - 0.62, y: 0.65, z: 0.8, wupp: 0.0052, pitch: 14, dur: 1.4, clip: 1.0 });
    await D.wait(0.8);
    mn.userData.awake = true;
    g.audio?.play?.('sparkle', { volume: 0.35 });
    await D.wait(0.45);
    mn.userData.awake = false;
    await D.cam({ x: P.x, y: 0.9, z: P.z, wupp: 0.0068, pitch: 18, dur: 0.6, clip: 1.4 });
    P.lookAt(null);
    P.setExpr('surprised');
    D.emote(P, 'interro');
    await D.wait(1.0);
    P.setExpr('awkward');
    await D.think(P, '...Did that cat just—', { auto: 1.6 });
    G.setExpr('happy');
    await D.say(G, "Come on, come on. Let's get that shutter up.", { expr: 'happy' });
    await D.fadeOut(1.4);
    C.keepOut(null);
    L.remove(G);
    P.drop('R'); P.drop('L');
  });
}
const ST_END = 38;
