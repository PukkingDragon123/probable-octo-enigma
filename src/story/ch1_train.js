// Chapter 1 — the Kodama, bound for Kodama-machi.
// A side-on cinematic through the car's big windows: green rice fields, old
// farmhouses behind their hedges, greenhouses and farm lanes, a tunnel that
// comes out on the tea country and Fuji, a wooded valley at sunset, rain, the
// town lights at dusk. Mamo rides alone, hood up, earbuds
// in. No word from Mom yet. He takes out his phone — and we're in his eyes:
// his own hands, the little sudoku app. Solve it and the attendant comes by
// with her cart and the last bento. Then a photo of Dad, and the arrival.
import * as THREE from 'three';
import { VoxelModel } from '../vox/voxel.js';
import { rbox, tone, buildGeo, matFor } from '../vox/kit.js';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { phoneMesh } from '../entities/parts.js';
import { dadPhoto } from '../ui/phone.js';
import { ROWX, OUT } from '../locations/train.js';

const FV = 0.025, V5 = 0.05;
function vm(model, scale, pivot = [0, 0, 0]) {
  const g = buildGeo(model, pivot, scale);
  const m = new THREE.Mesh(g, matFor(g, 0.05));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// the "Fuji Sunrise" ekiben: a lacquered box with a lid that lifts off
export function makeBento() {
  const g = new THREE.Group();
  const box = new VoxelModel(), lid = new VoxelModel();
  const lac = 0x2a1a1e, lacR = 0xa8302a, rim = 0xc89a3a;
  rbox(box, -8, 7, 0, 3, -6, 5, 0.5, (x, y, z) => (y === 3 && (x === -8 || x === 7 || z === -6 || z === 5) ? rim : y === 0 ? lac : lacR));
  // compartments: rice with umeboshi + sesame, tamagoyaki, karaage, salmon, pickles, broccoli
  for (let x = -7; x <= 6; x++) for (let z = -5; z <= 4; z++) {
    let c = null, y = 3;
    if (x <= -1) c = (x + z) % 5 === 0 ? 0x2a2a2a : 0xfaf8f0; // rice + sesame
    else if (z <= -1 && x <= 3) c = (x + z) % 2 ? 0xffd84a : 0xf0c030; // tamagoyaki
    else if (z <= -1) c = 0xd06a3a; // salmon
    else if (x <= 3) c = (x * z) % 3 === 0 ? 0x8a4a1a : 0xb8682a; // karaage
    else c = z % 2 ? 0xff9ab0 : 0x6ab04a; // pickles + broccoli
    box.set(x, y, z, c);
  }
  box.set(-4, 4, -1, 0xd8243a); box.set(-4, 4, 0, 0xc8143a); // umeboshi
  for (const [x, z] of [[1, 1], [2, 2], [1, 3]]) box.set(x, 4, z, 0xa85a2a); // karaage lumps
  box.set(5, 4, 2, 0x4a9a3a); box.set(5, 4, 3, 0x6ab04a);
  // divider
  for (let z = -5; z <= 4; z++) box.set(0, 4, z, 0x4a8a3a);
  rbox(lid, -8, 7, 0, 1, -6, 5, 0.5, (x, y, z) => (y === 1 && Math.abs(x + 0.5) < 3 && Math.abs(z + 0.5) < 2 ? 0xffd060 : lacR));
  // a little paper band label on the lid
  for (let z = -6; z <= 5; z++) { lid.set(-2, 2, z, 0xf4eadc); lid.set(-1, 2, z, 0xf4eadc); lid.set(0, 2, z, 0xe8443a); }
  const bm = vm(box, FV, [0.5, 0, 0.5]);
  const lp = new THREE.Group();
  lp.position.set(0, 4 * FV, 0);
  lp.add(vm(lid, FV, [0.5, 0, 0.5]));
  g.add(bm, lp);
  g.userData.lid = lp;
  g.userData.open = (k) => { lp.position.set(-k * 0.28, 4 * FV + Math.sin(k * Math.PI) * 0.12, 0); lp.rotation.z = k * 0.6; };
  return g;
}
// wagon-service cart
export function makeCart() {
  const v = new VoxelModel();
  const body = 0xd8d4cc, trim = 0xe8648a;
  rbox(v, -6, 5, 1, 16, -4, 3, 0.6, (x, y, z) => (y === 16 ? trim : y === 8 ? trim : (x + y) % 9 === 0 ? 0xc8c4bc : body));
  // goods on top: drink cans, bento stacks, snacks
  const goods = [[-5, 0x3a8ad8], [-3, 0xe8443a], [-1, 0xf0c040], [1, 0x6ab04a], [3, 0xe8e0d0]];
  for (const [x, c] of goods) for (let y = 17; y <= 19; y++) { v.set(x, y, -2, c); v.set(x + 1, y, -2, c); }
  for (let x = -5; x <= 4; x++) for (let z = 0; z <= 2; z++) { v.set(x, 17, z, 0xa8302a); v.set(x, 18, z, z === 1 ? 0xf4eadc : 0xa8302a); }
  for (const x of [-5, 4]) for (const z of [-3, 2]) v.set(x, 0, z, 0x2a2a30);
  // handle
  for (let z = -4; z <= 3; z++) v.set(-7, 14, z, 0x8a9098);
  return vm(v, V5, [0.5, 0, 0.5]);
}

const ANN = [
  { ja: 'まもなく、静岡です。', en: 'We will soon make a brief stop at Shizuoka.' },
  { ja: 'まもなく、終点、木霊町です。お忘れ物のないよう、ご注意ください。', en: 'We will soon arrive at Kodama-machi, the last stop. Please make sure you have all your belongings.' },
];
// camera shots (side-on carriage; Mamo's window seat is row 0)
const MX = ROWX(0) + 0.02;
const SHOT = {
  wide: { x: MX + 0.2, y: 1.3, z: -0.2, wupp: 0.0075, pitch: 4, yaw: 0, clip: 0 },
  // three-quarter front: his face under the hood, the country behind him (the seat ahead is cut away)
  mamo: { x: MX + 0.1, y: 0.95, z: -0.55, wupp: 0.0038, pitch: 10, yaw: 55, clip: 0.7 },
  window: { x: MX + 0.35, y: 1.12, z: -0.62, wupp: 0.0054, pitch: 3, yaw: 10, clip: 0 },
  face: { x: MX + 0.1, y: 0.97, z: -0.55, wupp: 0.0027, pitch: 8, yaw: 60, clip: 0.7 },
};
// the eyes, for first person
const EYE = { x: MX + 0.05, y: 0.98, z: -0.56 };
const LOOK_PHONE = { x: MX + 0.62, y: 0.68, z: -1.08 };

export async function trainTitleBackdrop(g) {
  const L = await g.goTo('train', {}, { transition: null });
  L.setSegment('country', { now: true });
  L.setTime('golden', 0);
  g.player.setHood(true);
  g.player.setExpr('hollow', { react: false });
  g.player.play('phone', { loop: true });
  if (!g.player.held.R) g.player.hold(phoneMesh(), 'R');
  // the Kodama running through the paddies at golden hour
  g.rig.play({ x: OUT.car7 + 2, y: 4.4, z: OUT.z, wupp: 0.03, pitch: 2, yaw: 0, dur: 0 });
  g.audio?.music?.('title');
}

// tap anywhere to go on (a little hand bobs over the thing to tap)
function waitTap(g, pos, autoT = 2.2) {
  const D = g.director;
  return new Promise((res) => {
    let done = false;
    const finish = () => { if (done) return; done = true; removeEventListener('pointerdown', on, true); g.emotes.unhint('tapme'); res(); };
    const on = (e) => { e.stopPropagation(); e.preventDefault(); finish(); };
    g.emotes.hint('tapme', pos, 'hintHand');
    addEventListener('pointerdown', on, true);
    if (g.autoPlay) D.wait(autoT).then(finish);
  });
}

export async function trainChapter(g) {
  const D = g.director;
  const L = g.location?.id === 'train' ? g.location : await g.goTo('train', {}, { transition: null });
  const P = g.player;
  const thought = (t, dur = 2.6) => D.caption(t, { kind: 'thought', dur });
  await D.cutscene(async () => {
    // ---- setup
    g.renderer.uniforms.fade.value = 1;
    L.setSegment('country', { now: true });
    L.setTime('day', 0);
    L.speedGoal = 1;
    P.setHood(true);
    P.setExpr('hollow', { react: false });
    P.stopAction();
    P.lookAt(null);
    g.audio?.music?.('phoneSad');
    g.audio?.ambience?.('train');
    g.renderer.setGrade('melancholy', 0);
    // ---- outside: the Kodama running through the paddies, nose to car 7
    D.cam({ x: OUT.x0 + 20, y: 6.2, z: OUT.z, wupp: 0.034, pitch: 2, yaw: 0, dur: 0 });
    await D.fadeIn(2.2);
    D.caption('The Kodama · bound for Kodama-machi', { dur: 4.2, kind: 'place' });
    await D.cam({ x: OUT.car7 + 5, y: 5.2, z: OUT.z, wupp: 0.03, pitch: 2, yaw: 0, dur: 9, ease: 'inOutSine' });
    // push in on one window...
    await D.cam({ x: OUT.car7 + 3.3, y: 2.62, z: OUT.z, wupp: 0.006, pitch: 2, yaw: 0, dur: 2.4, ease: 'inCubic' });
    await D.fadeOut(0.3);
    // ---- ...and inside, side-on: a slow dolly along the windows to Mamo
    D.cam({ ...SHOT.wide, x: MX - 3.4, dur: 0 });
    await D.fadeIn(0.6);
    await D.cam({ ...SHOT.wide, dur: 7.5, ease: 'inOutSine' });
    D.mark('mamo');
    await D.cam({ ...SHOT.mamo, dur: 2.6, ease: 'inOutSine' });
    P.lookAt({ x: MX + 0.6, y: 1.1, z: -1.4 }, 0.45);
    await D.wait(1.2);
    await D.think(P, '...', { auto: 1.4 });
    // the little one in row 2, nose on the glass
    D.say(L.kid, 'Mama, look! The rice fields go on forever!', { ambient: true, auto: 2.4, name: '' });
    await D.wait(2.6);
    // ---- the first announcement, then farmland: greenhouses, sheds, kei trucks
    const a1 = g.audio?.announce?.({ ja: ANN[0].ja, en: ANN[0].en });
    D.caption('“We will soon make a brief stop at Shizuoka.”', { dur: 4, kind: 'subtitle' });
    await Promise.race([a1, D.wait(6)]);
    D.mark('farm');
    L.setSegment('farm');
    D.cam({ ...SHOT.wide, x: MX + 1.6, dur: 3.5, ease: 'inOutSine' });
    await D.wait(6.5);
    // ---- a tunnel, and out into the tea country with Fuji
    L.setSegment('tunnel');
    g.audio?.ambience?.('tunnel');
    await D.wait(3.2);
    L.setSegment('tea');
    L.setTime('golden', 6);
    g.audio?.ambience?.('train');
    D.mark('fuji');
    await D.cam({ ...SHOT.window, dur: 2.4 });
    P.lookAt({ x: MX + 0.9, y: 1.3, z: -1.6 }, 0.5);
    await D.wait(2.0);
    await D.think(P, 'Fuji...', { auto: 1.6 });
    await D.think(P, 'Dad always said it looks shy from the train. It hides in the clouds when you try to look at it.', { auto: 2.8 });
    P.lookAt(null);
    // ---- the phone
    D.mark('phone');
    await D.cam({ ...SHOT.mamo, dur: 1.6 });
    if (!P.held.R) P.hold(phoneMesh(), 'R');
    P.play('phone', { loop: true });
    await D.wait(0.8);
    const hp = new THREE.Vector3(); P.anchorPos('R', hp);
    await waitTap(g, { x: hp.x, y: hp.y + 0.12, z: hp.z });
    // into his eyes
    D.cam({ ...SHOT.face, dur: 0.5, ease: 'inCubic' });
    await D.fadeOut(0.45);
    P.root.visible = false;
    const won = g.fp.play({ eye: EYE, look: LOOK_PHONE, seed: 7 });
    g.fp.app.lockHold = 5;
    D.letterbox(false);
    await D.fadeIn(0.6);
    D.mark('pov');
    await D.wait(1.2);
    await thought('No messages.', 2.2);
    await thought('...Mom must still be sad.', 2.6);
    await won;
    // ---- the cart comes down the aisle
    D.mark('cart');
    const att = new Character(CHARACTERS.attendant);
    L.add(att);
    att.setPos(MX + 3.8, L.aisleZ, 0); att.faceNow(-Math.PI / 2);
    const cart = makeCart();
    L.scene.add(cart);
    const cartFollow = () => { cart.position.set(att.x - 0.55, 0, att.z); };
    cartFollow();
    const tick = setInterval(cartFollow, 16);
    g.audio?.voice?.(CHARACTERS.attendant.voice, 'Bento, snacks, drinks~!', {});
    D.caption('“Bento, snacks, drinks~!”', { dur: 2.6, kind: 'subtitle' });
    const walking = D.walk(att, MX + 0.42, L.aisleZ, { free: true });
    await D.wait(1.6);
    g.fp.lowerGoal = 1;
    g.rig.setPov({ eye: EYE, look: { x: MX + 0.9, y: 0.95, z: L.aisleZ + 0.2 }, fov: 56, ease: 2.2 });
    await walking;
    cartFollow();
    att.faceTo(P.x, P.z);
    const hd = new THREE.Vector3(); att.headPos(hd);
    g.rig.setPov({ eye: EYE, look: { x: hd.x, y: hd.y - 0.1, z: hd.z }, fov: 52, ease: 2.5 });
    await D.wait(0.6);
    await D.say(att, 'Excuse me, young man? Would you like a bento?', { expr: 'smile', act: 'wave' });
    // back out of his eyes: his face under the hood, then her, shot and reverse shot
    await D.fadeOut(0.3);
    g.fp.stop();
    P.root.visible = true;
    D.letterbox(true);
    P.stopAction();
    P.faceTo(att.x, att.z); P.faceNow(P.yawGoal);
    att.faceTo(P.x, P.z); att.faceNow(att.yawGoal);
    const deg = (r) => r * 180 / Math.PI;
    // his face, turned up toward her (she is cut away by the clip plane)
    const hisClose = { x: P.x + 0.04, y: 0.97, z: P.z + 0.06, wupp: 0.0032, pitch: 8, yaw: deg(P.yawGoal) + 12, clip: 0.7, dur: 0 };
    D.cam(hisClose);
    await D.fadeIn(0.35);
    P.setExpr('surprised');
    D.emote(P, 'excl');
    P.squash(-0.2);
    await D.wait(0.4);
    await D.say(P, "Huh? Oh— um. No... no thanks.", { expr: 'awkward' });
    g.audio?.play?.('growl', { pitch: 2.4, volume: 0.35 });
    D.emote(P, 'sweat');
    P.setExpr('embarrassed');
    await D.wait(0.9);
    // the reverse: her face, from the window side (the far wall of the car behind her)
    att.headPos(hd);
    const herClose = { x: hd.x, y: hd.y - 0.04, z: hd.z, wupp: 0.0034, pitch: 4, yaw: deg(att.yawGoal) + 20, clip: 0.6, dur: 0 };
    const twoShot = { x: MX + 0.33, y: 1.05, z: 0.2, wupp: 0.005, pitch: 6, yaw: 165, clip: 0.95, dur: 0 };
    D.cam(herClose);
    await D.say(att, 'Ufufu~ your tummy says otherwise!', { expr: 'laugh' });
    D.cam(twoShot);
    await D.say(att, "Here. The 'Fuji Sunrise' ekiben — it's my last one. On the house.", { expr: 'happy' });
    const bento = makeBento();
    att.hold(bento, 'both');
    att.play('carry', { loop: true });
    await D.wait(0.5);
    att.play('give', { dur: 1.0 });
    await D.wait(0.45);
    att.drop('both');
    P.drop('R');
    P.hold(bento, 'both');
    P.play('carry', { loop: true });
    g.audio?.play?.('boxLift', { volume: 0.4 });
    await D.wait(0.5);
    D.cam(hisClose);
    await D.say(P, '...Thank you.', { expr: 'shy' });
    D.cam(herClose);
    await D.say(att, "Eat it while it's warm! Have a lovely trip~", { expr: 'joy', act: 'wave' });
    D.cam({ ...SHOT.wide, x: MX + 0.6, dur: 0 });
    clearInterval(tick);
    const leaving = D.walk(att, MX - 4.5, L.aisleZ, { free: true });
    const tick2 = setInterval(cartFollow, 16);
    leaving.then(() => { clearInterval(tick2); L.remove(att); L.scene.remove(cart); });
    // ---- a wooded valley at sunset, and the bento
    D.mark('bento');
    L.setSegment('valley');
    L.setTime('sunset', 10);
    P.faceNow(Math.PI / 2);
    await D.cam({ x: MX + 0.3, y: 0.58, z: -0.42, wupp: 0.0031, pitch: 38, yaw: 34, dur: 1.8, clip: 1.0 });
    for (let k = 0; k <= 1.0001; k += 0.04) { bento.userData.open(k); await D.wait(0.02); }
    g.audio?.play?.('bentoOpen', { volume: 0.5 });
    const bp = new THREE.Vector3(); bento.getWorldPosition(bp);
    g.particles.emit('sparkle', { x: bp.x, y: bp.y + 0.1, z: bp.z, n: 8 });
    g.particles.emit('steam', { x: bp.x, y: bp.y + 0.08, z: bp.z, n: 3 });
    P.setExpr('surprised', { react: false });
    await D.think(P, "...It's pretty.", { auto: 1.6 });
    await D.cam({ ...SHOT.window, x: MX + 0.5, wupp: 0.0058, dur: 2.0, clip: 0 });
    P.play('eat', { loop: true, onBite: () => g.audio?.play?.('munch', { volume: 0.35 }) });
    P.setExpr('delicious');
    await D.wait(2.6);
    P.setExpr('gentle');
    D.emote(P, 'heart');
    await D.wait(2.2);
    // ---- rain, and a photo of Dad (in his eyes again)
    D.mark('dad');
    P.stopAction();
    bento.visible = false;
    P.drop('both');
    L.setSegment('village');
    L.setTime('rain', 6);
    L.rain = 0.9;
    g.audio?.ambience?.('rain');
    await D.cam({ ...SHOT.mamo, dur: 1.6 });
    P.hold(phoneMesh(), 'R');
    P.play('phone', { loop: true });
    P.setExpr('hollow');
    await D.wait(1.0);
    await D.fadeOut(0.4);
    P.root.visible = false;
    g.fp.play({ eye: EYE, look: { x: MX + 0.5, y: 0.72, z: -1.18 }, seed: 9 });
    g.fp.app.showPhoto(dadPhoto(), 'Dad caught nothing. I caught one. He was so proud.');
    D.letterbox(false);
    await D.fadeIn(0.6);
    await D.wait(2.2);
    g.rig.setPov({ eye: EYE, look: { x: MX + 0.2, y: 1.0, z: -1.4 }, fov: 56, ease: 1.2 });
    g.fp.lowerGoal = 0.6;
    await D.wait(1.6);
    await thought("Dad would've loved this view.", 3.0);
    await D.wait(0.8);
    await D.fadeOut(0.5);
    g.fp.stop();
    P.root.visible = true;
    P.setExpr('teary');
    D.letterbox(true);
    // ---- the last tunnel, and the town lights at dusk
    D.mark('tunnel');
    D.cam({ ...SHOT.wide, x: MX - 0.8, dur: 0 });
    L.setSegment('tunnel');
    g.audio?.ambience?.('tunnel');
    await D.fadeIn(0.8);
    g.renderer.setGrade('humanNight', 1.2);
    await D.wait(3.4);
    L.rain = 0;
    L.setSegment('city');
    L.setTime('dusk', 0.01);
    g.audio?.ambience?.('train');
    g.renderer.setGrade('melancholy', 1.5);
    await D.cam({ ...SHOT.wide, x: MX + 0.4, dur: 4, ease: 'inOutSine' });
    await D.wait(1.5);
    // ---- arriving
    D.mark('arrive');
    D.caption('“We will soon arrive at Kodama-machi, the last stop.”', { dur: 5, kind: 'subtitle' });
    const a3 = g.audio?.announce?.({ ja: ANN[1].ja, en: ANN[1].en });
    L.speedGoal = 0.35;
    P.stopAction();
    P.setExpr('sad');
    await Promise.race([a3, D.wait(7)]);
    L.setSegment('station');
    await D.wait(2.4);
    L.speedGoal = 0;
    await D.cam({ ...SHOT.mamo, dur: 2.5 });
    await D.wait(1.0);
    g.audio?.play?.('trainDoor', { volume: 0.6 });
    await D.think(P, '...Here we go.', { auto: 1.4 });
    await D.fadeOut(1.4);
    g.audio?.music?.(null);
  });
}
