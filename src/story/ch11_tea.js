// Chapter 11 — tea for the Tengu (night 2, the Spirit Realm).
// From leaf to cup: pick the tea, steam it, roll it, dry it over the coals,
// brew it. The Hokori help, carrying bundles of leaves on their heads. Kappei
// the Kappa paddles over from his island on a cucumber floatie, Tarōbō drops
// in for his tea, and the two spirits squabble over it on the engawa. Then the
// magic: with the Happiness jar between them they make the first batch of
// Konyoki — little glowing capsules spiralling down into a crate for tomorrow.
import * as THREE from 'three';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { Hokori } from '../entities/hokori.js';
import { cloudPuff, leafBundle } from '../world/spiritIsland.js';
import { capsuleMesh, starMesh } from '../game/shopDay.js';
import { VoxelModel, vm, fill, V5 } from '../world/build.js';

const ISO = { yaw: 45, pitch: 46 };

export async function teaChapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('spirit', {}, { transition: null });
  L.revealIslands(0.01);
  L.setHokori(false);
  const T = L.tea;
  const G = new Character(CHARACTERS.genzo);
  const until = (fn) => new Promise((res) => { const t = setInterval(() => { if (fn()) { clearInterval(t); res(); } }, 150); });
  // a few Hokori helpers that follow the tea along
  const helpers = [];
  const upd = (dt) => { for (const h of helpers) h.update(dt); };
  L.updaters.push(upd);
  // ---- arrival + the task
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.add(G); G.setPos(-4.9, 3.6); G.faceNow(0.8);
    g.place(P, -5.5, 3.95, 0.8);
    P.setHood(false); P.setExpr('neutral', { react: false });
    D.cam({ x: -1.0, y: 0.4, z: 1.6, wupp: 0.02, pitch: ISO.pitch, yaw: ISO.yaw, dur: 0 });
    await D.fadeIn(1.2);
    g.audio?.music?.('spirit', { volume: 0.55 });
    D.caption('Night 2 · The Spirit Realm', { dur: 3, kind: 'place' });
    for (let i = 0; i < 4; i++) {
      const h = new Hokori({ seed: 40 + i * 9, size: 0.85 + (i % 2) * 0.2 });
      h.setPos(-0.4 + i * 0.45, 0.9 + (i % 2) * 0.3); L.scene.add(h.root); helpers.push(h);
      h.lookAt(P.root);
    }
    G.walkTo(-0.2, 1.15, { nav: L.nav });
    await D.walk(P, -0.9, 1.35, { nav: L.nav });
    for (const h of helpers) { h.setHappy(1.2); h.squash(0.5); }
    G.faceTo(P.x, P.z); P.faceTo(G.x, G.z);
    await D.cam({ x: -0.5, y: 0.7, z: 1.1, wupp: 0.0095, pitch: 36, yaw: ISO.yaw, dur: 1.4, clip: 2.0 });
    await D.say(G, 'Right! Tea, the old way. Five steps, and the Hokori will help.', { expr: 'determined' });
    await D.say(G, 'First, pick the ripe leaves — the bright ones on top of the bushes, in the tea field.', { expr: 'gentle', act: 'point' });
    D.follow(P);
  });
  // ---------------------------------------------------------------- 1. pick
  D.mark('pick');
  const ripe = L.teaSpots.filter((_, i) => i % 3 === 0).slice(0, 5);
  let picked = 0;
  const bushMarkers = ripe.map((sp, i) => {
    const m = new THREE.Group(); m.position.set(sp.x + 0.02, 0, sp.z + 0.02);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.3; m.add(hit);
    L.scene.add(m);
    L.addInteract({ id: 'bush' + i, obj: m, label: 'Tea bush', use: () => ({ x: sp.x + 0.15, z: sp.z + 0.46, yaw: Math.PI }), onUse: async () => {
      L.removeInteract('bush' + i);
      P.play('harvest', { dur: 1.2 });
      g.audio?.play?.('leafRustle', { volume: 0.5 });
      g.particles?.emit('leaf', { x: sp.x, y: 0.4, z: sp.z, n: 4 });
      await D.wait(0.9);
      picked++;
      // a Hokori runs the bundle to the steamer
      const h = helpers[picked % helpers.length];
      const b = leafBundle(); h.carry(b);
      h.setHappy(1);
      h.hopTo(sp.x + 0.4, sp.z + 0.7).then(() => h.hopTo(T.steamer.position.x + 0.1, T.steamer.position.z + 0.45, { speed: 1.8 })).then(() => { h.drop(); h.squash(0.5); });
      g.particles?.emit('sparkle', { x: sp.x, y: 0.6, z: sp.z, n: 3 });
    } });
    return m;
  });
  const auto = async (ids) => { for (const id of ids) { const it = L.getInteract(id); if (it) await g.useInteractable(it); await D.wait(0.2); } };
  if (g.autoPlay) auto(ripe.map((_, i) => 'bush' + i));
  await until(() => picked >= ripe.length && !g.busyUse);
  for (const m of bushMarkers) L.scene.remove(m);
  // ---------------------------------------------------------------- 2..5 the stations, in order
  const step = async ({ id, obj, label, say, use, anim, run }) => {
    g.bubbles.say(G, say, { auto: 2.2, ambient: true });
    g.particles?.emit('sparkle', { x: obj.position.x, y: 0.7, z: obj.position.z, n: 6 });
    let done = false;
    L.addInteract({ id, obj, label, use, onUse: async () => {
      L.removeInteract(id);
      P.stopAction();
      if (anim) P.play(anim.name, anim.opts);
      await run();
      P.stopAction();
      done = true;
    } });
    if (g.autoPlay) setTimeout(() => g.useInteractable(L.getInteract(id)), 900);
    await until(() => done && !g.busyUse);
  };
  const front = (o, dz = 0.55) => ({ x: o.position.x, z: o.position.z + dz, yaw: Math.PI });
  // steam
  D.mark('steam');
  await step({ id: 'steamer', obj: T.steamer, label: 'Steamer', use: front(T.steamer), say: 'Good! Into the steamer with them — just a minute, to keep them green!', anim: { name: 'pour', opts: { dur: 1.6 } }, run: async () => {
    T.steamer.userData.setOn(true);
    g.audio?.play?.('steam', { volume: 0.5 });
    for (let i = 0; i < 8; i++) { g.particles?.emit('steam', { x: T.steamer.position.x, y: 1.0, z: T.steamer.position.z, n: 2 }); await D.wait(0.25); }
    T.steamer.userData.setOn(false);
    const h = helpers[0]; h.carry(leafBundle());
    h.hopTo(T.roller.position.x, T.roller.position.z + 0.45, { speed: 1.6 }).then(() => { h.drop(); T.roller.userData.setLeaves(1); h.setHappy(1); });
    await D.wait(1.0);
  } });
  // roll
  D.mark('roll');
  await step({ id: 'roller', obj: T.roller, label: 'Rolling table', use: front(T.roller), say: 'Now roll them, gently — that\'s where the flavour comes from!', anim: { name: 'push', opts: { loop: true } }, run: async () => {
    g.audio?.play?.('rub', { volume: 0.4 });
    await D.tween((k) => T.roller.userData.setLeaves(1 - k * 0.45), 2.4);
    T.roller.userData.setLeaves(0);
    const h = helpers[1]; h.carry(leafBundle());
    h.hopTo(T.dryer.position.x, T.dryer.position.z + 0.45, { speed: 1.6 }).then(() => { h.drop(); T.dryer.userData.setLeaves(1, 0); h.setHappy(1); });
    await D.wait(1.0);
  } });
  // dry
  D.mark('dry');
  await step({ id: 'dryer', obj: T.dryer, label: 'Drying brazier', use: front(T.dryer, 0.6), say: 'Over the coals to dry. Keep them moving so they don\'t burn!', anim: { name: 'grind', opts: { loop: true } }, run: async () => {
    g.audio?.play?.('crackle', { volume: 0.4 });
    await D.tween((k) => { T.dryer.userData.setLeaves(1, k); if (Math.random() < 0.2) g.particles?.emit('steam', { x: T.dryer.position.x, y: 0.7, z: T.dryer.position.z, n: 1 }); }, 2.6);
    await D.wait(0.3);
  } });
  // brew
  D.mark('brew');
  await step({ id: 'brew', obj: T.brew, label: 'Tea tray', use: front(T.brew), say: 'And now — brew it! Not too hot!', anim: { name: 'pour', opts: { dur: 2.2 } }, run: async () => {
    T.dryer.userData.setLeaves(0);
    g.audio?.play?.('pour', { volume: 0.5 });
    await D.tween((k) => T.brew.userData.setTea(k), 2.0);
    g.particles?.emit('steam', { x: T.brew.position.x + 0.1, y: 0.35, z: T.brew.position.z, n: 4 });
  } });
  // ---------------------------------------------------------------- Kappei, Tarōbō, the verdict
  D.mark('kappei');
  const K = new Character(CHARACTERS.kappei);
  const Tg = new Character(CHARACTERS.tarobo);
  await D.cutscene(async () => {
    P.faceTo(G.x, G.z);
    G.setExpr('joy');
    await D.cam({ x: T.brew.position.x + 0.2, y: 0.5, z: T.brew.position.z + 0.3, wupp: 0.006, pitch: 34, yaw: ISO.yaw, dur: 1.0, clip: 1.6 });
    await D.say(G, '...Perfect colour. Your grandmother would be proud.', { expr: 'gentle' });
    P.setExpr('shy');
    // a splash and a cheerful "Oooi!" from below the island
    g.audio?.play?.('splash', { volume: 0.6 });
    await D.say(null, 'Ooooi!! Genzō-jiii!!', { anchor: { x: 7, y: -1, z: 4 }, name: '???', kind: 'shout', auto: 1.4 });
    P.setExpr('surprised'); D.emote(P, 'excl');
    for (const h of helpers) h.lookAt({ x: 7, y: 0, z: 5 });
    // Kappei bobs up on a cloud, floatie and all, and hops onto the grass
    L.add(K);
    const ride = cloudPuff(91, { r: 5 }); L.scene.add(ride);
    const a = { x: 9, y: -4, z: 6 }, b = { x: 5.0, y: 0, z: 3.4 };
    K.setPos(a.x, a.z, a.y + 0.3); K.faceNow(-2.2); K.setExpr('joy', { react: false });
    await D.cam({ x: 3.6, y: 0.4, z: 2.6, wupp: 0.014, pitch: 40, yaw: ISO.yaw, dur: 1.0 });
    await D.tween((k) => { const e = 1 - (1 - k) ** 3; const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e + Math.sin(k * Math.PI) * 0.8, z = a.z + (b.z - a.z) * e; ride.position.set(x, y - 0.4, z); K.setPos(x, z, y + 0.05); }, 2.2);
    K.setPos(b.x, b.z, 0); K.play('jump');
    g.audio?.play?.('boing', { volume: 0.5 });
    D.tween((k) => { ride.position.y = -0.4 - k * 6; }, 1.6);
    await K.walkTo(0.8, 0.5, { nav: L.nav, run: true });
    K.faceTo(G.x, G.z); G.faceTo(K.x, K.z); P.faceTo(K.x, K.z);
    await D.cam({ x: -0.1, y: 0.7, z: 1.0, wupp: 0.0095, pitch: 36, yaw: ISO.yaw, dur: 1.0, clip: 2.2 });
    await D.say(K, 'Genzō-jii! It IS you! The clouds cleared and I thought — no way!', { expr: 'joy', name: 'Kappei' });
    G.setExpr('laugh');
    await D.say(G, 'Kappei! Still swimming laps around your island every morning?', { expr: 'laugh' });
    await D.say(K, 'Two hundred! Before breakfast! Then cucumber salad!', { expr: 'proud', act: 'cheer', name: 'Kappei' });
    K.faceTo(P.x, P.z);
    K.setExpr('excited');
    await D.say(K, 'And who\'s this? A little turtle! Hey! You swim?', { expr: 'excited', name: 'Kappei' });
    P.setExpr('awkward');
    await D.say(P, '...Not really.', { expr: 'awkward' });
    await D.say(K, 'I\'ll teach you! Turtles are born for it! It\'s in your shell!', { expr: 'joy', act: 'point', name: 'Kappei' });
    // Tarōbō drops out of the sky, right on time for tea
    D.mark('tengu');
    g.audio?.play?.('windGust', { volume: 0.8 });
    D.shake(0.35);
    for (const h of helpers) h.squash(0.8);
    L.add(Tg);
    Tg.setPos(1.2, -0.2, 6); Tg.faceNow(0.6);
    Tg.setExpr('grumpy', { react: false });
    await D.tween((k) => Tg.setPos(0.4 + (1 - k) * 2, 0.75, 6 * (1 - k) ** 2), 1.0);
    g.particles?.emit('dustBig', { x: 0.4, y: 0.2, z: 0.75, n: 6 });
    Tg.setPos(0.4, 0.75, 0);
    await D.cam({ x: 0.2, y: 0.8, z: 1.2, wupp: 0.0102, pitch: 36, yaw: ISO.yaw, dur: 0.8, clip: 2.4 });
    await D.say(Tg, 'Hmph. I smell tea. Is it ready, or must I wait another forty years?', { expr: 'skeptical', act: 'hipsHands', name: 'Tarōbō' });
    K.setExpr('pout');
    await D.say(K, 'Ugh. Big Nose is here.', { expr: 'pout', name: 'Kappei' });
    Tg.setExpr('angry');
    await D.say(Tg, 'What did you call me, you soggy pickle?!', { expr: 'furious', name: 'Tarōbō' });
    G.setExpr('awkward'); D.emote(G, 'sweat');
    await D.say(G, 'Now, now! Sit, both of you. Mamoru made it himself.', { expr: 'awkward', act: 'holdOut' });
    // everyone on the engawa
    D.mark('engawa');
    const ey = L.house.userData.engawaY;
    const seats = [[-1.25, -0.12, G], [0.0, -0.12, P], [1.45, -0.12, Tg], [2.75, -0.12, K]];
    await D.fadeOut(0.6);
    for (const [x, z, c] of seats) { c.stopAction(); c.setPos(x, z); c.faceNow(0); c.setPose('sit'); c.y = ey - c.dims.hipY * 0.05 * c.scale + 0.05; c.idleT = 999; }
    T.brew.position.set(0.72, ey, 0.25);
    helpers.forEach((h, i) => h.setPos(-1.2 + i * 1.3, 0.85));
    D.cam({ x: 0.75, y: 0.6, z: 0.5, wupp: 0.0122, pitch: 34, yaw: ISO.yaw, dur: 0, clip: 2.6 });
    await D.fadeIn(0.8);
    for (const c of [G, P, Tg, K]) c.play('drink', { dur: 2.2 });
    g.audio?.play?.('sip', { volume: 0.5 });
    await D.wait(2.4);
    await D.cam({ x: Tg.x, y: 0.9, z: 0.2, wupp: 0.0055, pitch: 26, yaw: ISO.yaw, dur: 1.0, clip: 1.6 });
    Tg.setExpr('thinking');
    await D.wait(1.0);
    Tg.setExpr('surprised');
    await D.wait(0.5);
    Tg.setExpr('smug');
    await D.say(Tg, '...Hm. The leaves were rolled by an amateur.', { expr: 'skeptical', name: 'Tarōbō' });
    P.setExpr('sad');
    await D.say(Tg, '...But they were rolled with care. It is... acceptable.', { expr: 'smug', name: 'Tarōbō' });
    await D.cam({ x: 0.75, y: 0.6, z: 0.5, wupp: 0.0122, pitch: 34, yaw: ISO.yaw, dur: 0.8, clip: 2.6 });
    K.setExpr('laugh');
    await D.say(K, 'That\'s Tengu for "delicious"! He had three sips!', { expr: 'laugh', name: 'Kappei' });
    Tg.setExpr('furious'); D.emote(Tg, 'anger');
    P.setExpr('smile'); D.emote(P, 'note');
    await D.wait(1.0);
  });
  // ---------------------------------------------------------------- the first Konyoki
  D.mark('konyoki');
  await D.cutscene(async () => {
    G.setExpr('gentle');
    await D.say(G, 'Now, my friends. The shop is open again. Will you make Konyoki for us?', { expr: 'gentle' });
    K.setExpr('excited');
    await D.say(K, 'Leave it to me! Cucumbers! Cucumbers in little suits! Working hard at the office!', { expr: 'excited', act: 'cheer', name: 'Kappei' });
    Tg.setExpr('smug');
    await D.say(Tg, 'Hmph. Mine will be far grander. Once the jar is fuller.', { expr: 'proud', name: 'Tarōbō' });
    // the jar (a glowing pot of Happiness) between them; capsules spiral out of the light
    const jar = new THREE.Group();
    const jv = new VoxelModel(); for (let y = 0; y < 8; y++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z <= 9) jv.set(x, y, z, y === 7 ? 0xd8c890 : 0xfff0c0);
    jar.add(vm(jv, V5, [0.5, 0, 0.5]));
    jar.position.set(2.1, L.house.userData.engawaY, 0.3); L.scene.add(jar);
    K.stopAction(); K.setPose('stand'); K.y = L.house.userData.engawaY;
    K.play('holdUp', { loop: true });
    await D.cam({ x: 1.6, y: 1.3, z: 0.8, wupp: 0.0125, pitch: 34, yaw: ISO.yaw, dur: 1.4 });
    g.audio?.play?.('magicRise', { volume: 0.6 });
    await D.flash(0xfff0c0, 0.6);
    const caps = [];
    for (let i = 0; i < 12; i++) {
      const c = capsuleMesh(i % 3 === 0 ? 0x6ab04a : i % 3 === 1 ? 0x8ad860 : 0xf4f0e8);
      const glow = starMesh(0xc8ffb0); glow.scale.setScalar(0.6); c.add(glow);
      L.scene.add(c); caps.push(c);
    }
    const crate = new THREE.Group();
    const cv = new VoxelModel(); fill(cv, -6, 5, 0, 5, -4, 3, (x, y, z) => (y === 0 || x === -6 || x === 5 || z === -4 || z === 3 ? 0x8a5a32 : undefined));
    crate.add(vm(cv, V5, [0.5, 0, 0.5])); crate.position.set(2.1, 0, 1.1); L.scene.add(crate);
    await D.tween((k) => {
      caps.forEach((c, i) => {
        const t = Math.max(0, Math.min(1, k * 1.6 - i * 0.05));
        const a = t * Math.PI * 4 + i * 0.52, r = 0.7 * (1 - t) + 0.05;
        const y = 1.2 + Math.sin(t * Math.PI) * 1.4 - t * 1.0;
        c.position.set(2.1 + Math.cos(a) * r, Math.max(0.12, y), 0.7 + Math.sin(a) * r * 0.8 + t * 0.4);
        c.rotation.set(t * 6, t * 4, 0);
      });
    }, 4.0, (x) => x);
    g.audio?.play?.('sparkle', { volume: 0.6 });
    g.particles?.emit('sparkle', { x: 2.1, y: 0.4, z: 1.1, n: 14 });
    K.stopAction();
    D.caption('New Konyoki: "Kyūri Office" (cucumber office workers)', { dur: 3.4, kind: 'place' });
    await D.wait(1.0);
    P.setExpr('surprised');
    await D.say(P, '...They\'re glowing.', { expr: 'surprised' });
    G.setExpr('nostalgic');
    await D.say(G, 'That\'s a spirit\'s happiness, Mamoru. Tomorrow some child will open one of those and feel it.', { expr: 'nostalgic' });
    await D.wait(0.6);
    g.state.konyoki = Array.from(new Set([...(g.state.konyoki || []), 'kyuriOffice']));
    await D.cam({ x: 0, y: -0.6, z: 1.2, wupp: 0.034, pitch: 44, yaw: ISO.yaw, dur: 3.5, ease: 'inOutSine' });
    await D.fadeOut(2.0);
    L.updaters = L.updaters.filter((f) => f !== upd);
    for (const h of helpers) L.scene.remove(h.root);
    for (const c of [...caps, crate, jar]) L.scene.remove(c);
    for (const c of [G, K, Tg]) L.remove(c);
    P.setPose('stand'); P.y = 0; P.stopAction();
    T.brew.position.set(-0.95, 0, 0.6); T.brew.userData.setTea(0);
    await D.title('Day 3', 'Kyūri Office arrives', 2.4);
  });
}
