// Chapter 1 — the Kodama, bound for Kodama-machi.
// Mamo rides alone, hood up, earbuds in, on his phone. Mom's texts, station
// announcements, Fuji, a kind attendant and an ekiben, a photo of Dad, a
// tunnel, and the lights of the city at dusk.
import * as THREE from 'three';
import { VoxelModel } from '../vox/voxel.js';
import { rbox, tone, buildGeo, matFor } from '../vox/kit.js';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { phoneMesh } from '../entities/parts.js';

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
  { ja: 'まもなく、静岡です。', en: 'We will soon make a brief stop at Shizuoka.', ticker: '次は 静岡   NEXT  Shizuoka' },
  { ja: 'まもなく、浜松です。お出口は左側です。', en: 'We will soon make a brief stop at Hamamatsu. The doors on the left side will open.', ticker: '次は 浜松   NEXT  Hamamatsu' },
  { ja: 'まもなく、終点、木霊町です。お忘れ物のないよう、ご注意ください。', en: 'We will soon arrive at Kodama-machi, the last stop. Please make sure you have all your belongings.', ticker: 'まもなく 木霊町   ARRIVING  Kodama-machi' },
];

export async function trainTitleBackdrop(g) {
  const L = await g.goTo('train', {}, { transition: null });
  L.pano.setTime('golden', 0.01);
  L.pano.setSegment('rice');
  L.setTicker('こだま号   KODAMA  for Kodama-machi');
  g.player.setHood(true);
  g.player.setExpr('hollow', { react: false });
  g.player.play('phone', { loop: true });
  if (!g.player.held.R) g.player.hold(phoneMesh(), 'R');
  g.rig.play({ x: 0.4, y: 1.0, z: -0.8, wupp: 0.0095, pitch: 16, yaw: 56, dur: 0 });
  g.rig.sway = 0.6;
  g.audio?.music?.('title');
}

export async function trainChapter(g) {
  const D = g.director;
  const L = g.location?.id === 'train' ? g.location : await g.goTo('train', {}, { transition: null });
  const P = g.player, phone = g.phone;
  await D.cutscene(async () => {
    // ---- setup
    g.renderer.uniforms.fade.value = 1;
    L.pano.setTime('day', 0.01);
    L.pano.setSegment('rice');
    L.speedGoal = 1;
    L.setTicker('こだま号   KODAMA  for Kodama-machi');
    P.setHood(true);
    P.setExpr('hollow', { react: false });
    P.play('phone', { loop: true });
    if (!P.held.R) P.hold(phoneMesh(), 'R');
    g.audio?.music?.('phoneSad');
    g.audio?.ambience?.('train');
    g.renderer.setGrade('melancholy', 0);
    // ---- open on his face, then pull back to the window
    D.cam({ x: 0.3, y: 0.85, z: -1.0, wupp: 0.0042, pitch: 12, yaw: 68, dur: 0 });
    await D.fadeIn(2.2);
    D.caption('The Kodama · bound for Kodama-machi', { dur: 3.5, kind: 'place' });
    await D.wait(1.2);
    await D.cam({ x: 0.4, y: 1.0, z: -0.9, wupp: 0.0085, pitch: 17, yaw: 58, dur: 5.5, ease: 'inOutSine' });
    await D.wait(0.5);
    phone.track.t = 31;
    phone.show('music', { compact: true });
    await D.wait(3.2);
    // ---- Mom
    phone.receive('Mom', 'Did you eat something?');
    await D.wait(1.4);
    phone.go('messages');
    await D.wait(1.2);
    phone.receive('Mom', "Grandpa will meet you at Kodama-machi station. He's so excited to see you.");
    await D.wait(2.2);
    phone.receive('Mom', "I'm sorry I can't come with you. I love you, Mamo.");
    await D.wait(2.0);
    await phone.type('me too', { erase: true, speed: 0.12 });
    await D.wait(0.6);
    await phone.type('ok', { speed: 0.15 });
    await D.wait(0.8);
    phone.go('music');
    await D.think(P, '...', { auto: 1.4 });
    phone.hide();
    // ---- first announcement
    L.setTicker(ANN[0].ticker);
    const a1 = g.audio?.announce?.({ ja: ANN[0].ja, en: ANN[0].en });
    D.caption('“We will soon make a brief stop at Shizuoka.”', { dur: 4, kind: 'subtitle' });
    await Promise.race([a1, D.wait(7)]);
    L.pano.setSegment('river');
    await D.wait(4);
    L.pano.setSegment('mountain');
    L.pano.setTime('golden', 10);
    await D.wait(2.5);
    await D.cam({ x: 0.2, y: 1.05, z: -1.0, wupp: 0.0075, pitch: 14, yaw: 48, dur: 2.5 });
    P.lookAt({ x: 0.3, y: 1.1, z: -2.5 });
    await D.think(P, 'Fuji...', { auto: 1.6 });
    await D.think(P, 'Dad always said it looks shy from the train. It hides in the clouds when you try to look at it.', { auto: 2.6 });
    P.lookAt(null);
    // ---- the attendant and the bento
    const att = new Character(CHARACTERS.attendant);
    L.add(att);
    att.setPos(6.4, L.aisleZ, 0); att.faceNow(-Math.PI / 2);
    const cart = makeCart();
    L.scene.add(cart);
    const cartFollow = () => { cart.position.set(att.x - 0.55, 0, att.z); cart.rotation.y = 0; };
    cartFollow();
    att.onFrame = cartFollow;
    D.cam({ x: 1.3, y: 0.9, z: -0.4, wupp: 0.009, pitch: 18, yaw: 62, dur: 2.5 });
    const walking = D.walk(att, 1.25, L.aisleZ, { free: true });
    const iv = setInterval(cartFollow, 16);
    await D.say(att, 'Bento, snacks, drinks~! Anyone for a bento?', { expr: 'smile', auto: 1.2 });
    await walking;
    clearInterval(iv); cartFollow();
    att.faceTo(P.x, P.z);
    await D.say(att, 'Excuse me, young man? Something to eat?', { expr: 'smile' });
    await D.wait(0.8);
    D.emote(att, 'dots');
    await D.wait(1.0);
    await D.say(att, 'Helloooo?', { expr: 'confused', act: 'wave' });
    P.stopAction();
    P.setExpr('surprised');
    D.emote(P, 'excl');
    P.squash(-0.2);
    await D.wait(0.4);
    P.faceTo(att.x, att.z);
    await D.say(P, "Huh? Oh— um. Sorry. No... no thanks.", { expr: 'awkward' });
    g.audio?.play?.('growl', { pitch: 2.4, volume: 0.35 });
    D.emote(P, 'sweat');
    P.setExpr('embarrassed');
    await D.wait(0.9);
    await D.say(att, 'Ufufu~ your tummy says otherwise!', { expr: 'laugh' });
    await D.say(att, "Here. The 'Fuji Sunrise' ekiben — it's my last one. On the house.", { expr: 'happy' });
    const bento = makeBento();
    att.hold(bento, 'both');
    att.play('carry', { loop: true });
    await D.wait(0.5);
    att.play('give', { dur: 1.0 });
    await D.wait(0.45);
    att.drop('both');
    P.hold(bento, 'both');
    P.play('carry', { loop: true });
    g.audio?.play?.('boxLift', { volume: 0.4 });
    await D.wait(0.5);
    await D.say(P, '...Thank you.', { expr: 'shy' });
    await D.say(att, "Eat it while it's warm! Have a lovely trip~", { expr: 'joy', act: 'wave' });
    const leaving = D.walk(att, 7.5, L.aisleZ, { free: true });
    const iv2 = setInterval(cartFollow, 16);
    leaving.then(() => { clearInterval(iv2); L.remove(att); L.scene.remove(cart); });
    // ---- open the bento
    await D.cam({ x: 0.45, y: 0.6, z: -0.95, wupp: 0.0034, pitch: 40, yaw: 62, dur: 1.6 });
    for (let k = 0; k <= 1.0001; k += 0.04) { bento.userData.open(k); await D.wait(0.02); }
    g.audio?.play?.('bentoOpen', { volume: 0.5 });
    const bp = new THREE.Vector3(); bento.getWorldPosition(bp);
    g.particles.emit('sparkle', { x: bp.x, y: bp.y + 0.1, z: bp.z, n: 8 });
    g.particles.emit('steam', { x: bp.x, y: bp.y + 0.08, z: bp.z, n: 3 });
    P.setExpr('surprised', { react: false });
    await D.think(P, "...It's pretty.", { auto: 1.6 });
    await D.cam({ x: 0.3, y: 0.85, z: -0.95, wupp: 0.0055, pitch: 15, yaw: 64, dur: 1.4 });
    P.play('eat', { loop: true, onBite: () => g.audio?.play?.('munch', { volume: 0.35 }) });
    P.setExpr('delicious');
    await D.wait(2.4);
    P.setExpr('gentle');
    D.emote(P, 'heart');
    await D.wait(2.2);
    // ---- Dad
    P.stopAction();
    bento.visible = false;
    P.drop('both');
    P.play('phone', { loop: true });
    P.setExpr('hollow');
    await D.wait(0.8);
    phone.show('photo', { compact: true });
    L.pano.rain = 0.6;
    L.pano.setTime('sunset', 8);
    g.audio?.ambience?.('rain');
    await D.wait(2.5);
    P.setExpr('teary');
    await D.think(P, "Dad would've loved this view.", { auto: 2.4 });
    await D.wait(1.2);
    phone.hide();
    // ---- tunnel
    L.pano.setSegment('tunnel');
    g.audio?.ambience?.('tunnel');
    g.renderer.setGrade('humanNight', 0.6);
    await D.wait(3.5);
    L.pano.rain = 0;
    L.pano.setTime('dusk', 0.01);
    L.pano.setSegment('city');
    g.audio?.ambience?.('train');
    g.renderer.setGrade('melancholy', 1.5);
    await D.cam({ x: 0.3, y: 1.0, z: -1.0, wupp: 0.0095, pitch: 15, yaw: 55, dur: 3 });
    await D.wait(2.5);
    // ---- arriving
    L.setTicker(ANN[2].ticker);
    D.caption('“We will soon arrive at Kodama-machi, the last stop.”', { dur: 5, kind: 'subtitle' });
    const a3 = g.audio?.announce?.({ ja: ANN[2].ja, en: ANN[2].en });
    L.speedGoal = 0.15;
    P.stopAction();
    P.setExpr('sad');
    await Promise.race([a3, D.wait(8)]);
    L.pano.setSegment('station');
    L.speedGoal = 0;
    await D.wait(2.0);
    g.audio?.play?.('trainDoor', { volume: 0.6 });
    await D.think(P, "...Here we go.", { auto: 1.4 });
    await D.fadeOut(1.4);
    g.audio?.music?.(null);
  });
}
