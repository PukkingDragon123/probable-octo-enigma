// Chapter 12 — Day 3: Kyūri Office arrives.
// A crate is waiting by the basement door, faintly glowing. Mamo opens it and
// the Konyoki float up one by one: five cucumber office workers, each settling
// into its place in the collection cabinet. The sixth slot stays a "?" — Kappei
// hid a secret somewhere in the batch. The capsules go into a machine, the
// banner lights up, and word has spread: Mio is outside with her whole class.
// A busy day hunting the secret. When the jar is half full, the old
// maneki-neko on the counter opens its eyes, says "Nyaa", and starts gathering
// Happiness by itself. At closing, Yuki brings a bento from Bendy's.
import * as THREE from 'three';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { ShopDay } from '../game/shopDay.js';
import { SERIES, konyokiFigure } from '../game/konyoki.js';
import { VoxelModel, vm, glowVm, fill, ell, hash3, V5 } from '../world/build.js';

function konyokiCrate() {
  const v = new VoxelModel(), gl = new VoxelModel();
  fill(v, -7, 6, 0, 8, -5, 4, (x, y, z) => (x === -7 || x === 6 || z === -5 || z === 4 || y === 0 ? ((x + y) % 4 === 0 ? 0x6a4224 : 0x8a5a32) : null));
  fill(v, -7, 6, 4, 4, 4, 4, 0x5a3420); // band
  fill(v, -2, 1, 6, 7, 5, 5, 0xe8c050); // brass plate
  for (let x = -6; x <= 5; x++) for (let z = -4; z <= 3; z++) gl.set(x, 7, z, hash3(x, 7, z) < 0.5 ? 0x9af078 : 0xd8ffb8);
  const lid = new VoxelModel(); fill(lid, -7, 6, 0, 1, -5, 4, (x, y, z) => ((x + z) % 5 === 0 ? 0x6a4224 : 0x9a6a3c));
  const g = new THREE.Group();
  const glow = glowVm(gl, V5, [0.5, 0, 0.5], { intensity: 1.2, mode: 6 });
  const lm = vm(lid, V5, [0.5, 0, 0.5]); lm.position.y = 9 * V5;
  g.add(vm(v, V5, [0.5, 0, 0.5]), glow, lm);
  g.userData.lid = lm; g.userData.glow = glow;
  return g;
}

export async function day3Chapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('kodamaya', {}, { transition: null });
  g.state.konyoki = Array.from(new Set([...(g.state.konyoki || []), 'kyuriOffice']));
  g.state.collection ||= {};
  g.state.collection.kyuriOffice ||= [];
  L.setDay(9.0);
  const day = (L.day = new ShopDay(g, L));
  for (const m of day.machines) day.setStock(m, 0.55 + Math.random() * 0.45);
  const km = day.machines.find((m) => m.z > -1) || day.machines[0]; // a machine on the front island
  day.setStock(km, 0);
  const G = new Character(CHARACTERS.genzo);
  const until = (fn) => new Promise((res) => { const t = setInterval(() => { if (fn()) { clearInterval(t); res(); } }, 150); });
  const crate = konyokiCrate();
  crate.position.set(-3.2, 0, -1.7);
  L.scene.add(crate);
  // ---- morning: the crate by the basement door
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.add(G); G.setPos(-2.6, -1.3); G.faceNow(-0.9);
    g.place(P, -1.5, 0.9, Math.PI);
    P.setHood(false); P.setExpr('sleepy', { react: false });
    D.cam({ x: -2.4, y: 0.9, z: -0.6, wupp: 0.0095, pitch: 30, dur: 0 });
    await D.fadeIn(1.0);
    g.audio?.music?.('shopDay', { volume: 0.5 });
    await D.say(G, 'Mamoru! Come look — it was waiting by the basement door this morning.', { expr: 'excited', act: 'point' });
    await D.walk(P, -2.75, -0.95, { nav: L.nav });
    P.faceTo(crate.position.x, crate.position.z);
    P.setExpr('surprised');
    D.emote(P, 'excl');
    await D.cam({ x: -3.0, y: 0.6, z: -1.3, wupp: 0.0065, pitch: 28, dur: 1.2, clip: 1.6 });
    await D.say(G, 'Kappei\'s first batch. Go on — you open it.', { expr: 'gentle' });
  });
  // tap the crate to open it
  D.mark('crate');
  let opened = false;
  L.addInteract({ id: 'crate', obj: crate, label: 'Crate', use: { x: crate.position.x + 0.15, z: crate.position.z + 0.6, yaw: Math.PI }, onUse: async () => { L.removeInteract('crate'); opened = true; } });
  if (g.autoPlay) setTimeout(() => g.useInteractable(L.getInteract('crate')), 600);
  await until(() => opened && !g.busyUse);
  // ---- the unboxing: each Konyoki floats up and into its slot in the cabinet
  await D.cutscene(async () => {
    P.play('pickup', { dur: 1.0 });
    await D.wait(0.5);
    g.audio?.play?.('woodCreak', { volume: 0.5 });
    await D.tween((k) => { crate.userData.lid.position.set(k * 0.3, (9 + k * 6) * V5, -k * 0.2); crate.userData.lid.rotation.z = -k * 1.2; }, 0.7);
    g.audio?.play?.('magicRise', { volume: 0.6 });
    await D.flash(0xd8ffc0, 0.5);
    const cab = L.cabinet;
    cab.updateMatrixWorld(true);
    const vs = SERIES.kyuriOffice.variants;
    const owned = new Set(g.state.collection.kyuriOffice);
    // the cabinet starts with silhouettes for all six (secret as "?")
    L.refreshCollection();
    await D.cam({ x: -3.6, y: 0.9, z: 0.4, wupp: 0.0105, pitch: 26, dur: 1.0 });
    for (let i = 0; i < 5; i++) {
      const v = vs[i];
      const fig = konyokiFigure('kyuriOffice', v.id);
      fig.scale.setScalar(1.6);
      L.scene.add(fig);
      const from = new THREE.Vector3(crate.position.x, 0.45, crate.position.z);
      const top = new THREE.Vector3(crate.position.x - 0.2, 1.5, crate.position.z + 0.5);
      g.audio?.play?.('pop', { volume: 0.4, pitch: 1 + i * 0.12 });
      await D.tween((k) => { fig.position.lerpVectors(from, top, k * k * (3 - 2 * k)); fig.rotation.y = k * Math.PI * 2; }, 0.7);
      g.particles?.emit('sparkle', { x: top.x, y: top.y + 0.2, z: top.z, n: 5 });
      D.caption(`${v.ja} · ${v.name}${v.rarity === 'rare' ? '  ★ rare' : ''}`, { dur: 1.3, kind: 'place' });
      await D.wait(0.8);
      // into the cabinet
      const slot = cab.userData.slots[i];
      const dst = cab.localToWorld(new THREE.Vector3(slot.x, slot.y, slot.z));
      await D.tween((k) => { fig.position.lerpVectors(top, dst, k * k); fig.scale.setScalar(1.6 - k * 0.6); fig.rotation.y = Math.PI * 2 + k * cab.rotation.y; }, 0.55);
      L.scene.remove(fig);
      owned.add(v.id);
      cab.userData.setSlot(i, konyokiFigure('kyuriOffice', v.id));
      g.audio?.play?.('coin', { volume: 0.3, pitch: 1.5 });
    }
    g.state.collection.kyuriOffice = [...owned];
    await D.cam({ x: -3.9, y: 1.0, z: 1.8, wupp: 0.0058, pitch: 18, dur: 1.0, clip: 1.4 });
    P.walkTo(-3.3, 1.45, { nav: L.nav }).then(() => P.faceTo(cab.position.x, cab.position.z));
    await D.wait(0.8);
    P.setExpr('smile');
    await D.think(P, '...They\'re kind of great.', { auto: 1.4 });
    G.walkTo(-2.7, 1.2, { nav: L.nav });
    await D.say(G, 'We keep one of every Konyoki here. That last spot — Kappei said he hid a *secret* in the batch.', { expr: 'smug' });
    await D.say(G, 'Somewhere in that machine is a golden one. Some lucky child will find it!', { expr: 'excited' });
    // load the machine
    D.mark('load');
    await D.say(G, 'Now — into the machine with the rest of them!', { expr: 'determined', act: 'point' });
    L.makeKonyokiMachine(km, 'kyuriOffice');
    D.follow(P);
  });
  // carry the crate's capsules to the machine (one trip)
  let loaded = false;
  L.addInteract({ id: 'crate2', obj: crate, label: 'Crate', use: { x: crate.position.x + 0.15, z: crate.position.z + 0.6, yaw: Math.PI }, onUse: async () => {
    L.removeInteract('crate2');
    await day.takeBag();
    crate.userData.glow.visible = false;
    L.addInteract({ id: 'km', obj: km.obj, label: 'Kyūri machine', use: { x: km.x, z: km.z + 0.52, yaw: Math.PI }, onUse: async () => { L.removeInteract('km'); await day.refill(km); loaded = true; } });
    if (g.autoPlay) setTimeout(() => g.useInteractable(L.getInteract('km')), 400);
  } });
  g.particles?.emit('sparkle', { x: crate.position.x, y: 0.6, z: crate.position.z, n: 6 });
  if (g.autoPlay) setTimeout(() => g.useInteractable(L.getInteract('crate2')), 600);
  await until(() => loaded && !g.busyUse);
  // ---- open: Mio and her classmates are waiting outside
  D.mark('open');
  const M = new Character(CHARACTERS.mio);
  await D.cutscene(async () => {
    g.particles?.emit('sparkle', { x: km.x, y: 1.3, z: km.z + 0.2, n: 10 });
    g.audio?.play?.('sparkle', { volume: 0.5 });
    await D.cam({ x: km.x, y: 1.1, z: km.z + 0.6, wupp: 0.0068, pitch: 22, dur: 0.9, clip: 1.6 });
    await D.wait(0.6);
    g.audio?.play?.('doorBell', { volume: 0.6 });
    L.add(M); M.setPos(-0.5, 3.6); M.faceNow(Math.PI);
    M.setExpr('excited', { react: false });
    await D.cam({ x: -0.2, y: 0.9, z: 1.6, wupp: 0.0105, pitch: 28, dur: 0.8 });
    await M.walkTo(-0.4, 2.0, { run: true });
    await D.say(M, 'Mamoru-kun! I told EVERYONE about the secret capsule! The whole class came!', { expr: 'joy', act: 'wave', name: 'Mio' });
    // two classmates crowd in behind her
    day.spawnCustomer({ role: 'student', x: -1.0, plays: 2 });
    day.spawnCustomer({ role: 'student', x: 0.4, plays: 2 });
    P.setExpr('awkward'); D.emote(P, 'sweat');
    G.setExpr('laugh');
    await D.say(G, 'Ho ho! Business is booming! Let\'s get to work!', { expr: 'laugh', act: 'cheer' });
    M.walkTo(km.x - 0.5, km.z + 0.95, { nav: L.nav }).then(() => M.faceYaw(Math.PI + 0.3));
    G.walkTo(3.05, -1.55, { nav: L.nav }).then(() => G.faceYaw(0.2)); // back behind the counter
    D.follow(P);
  });
  // ---- the day (free play)
  D.mark('day');
  for (const m of day.machines) {
    L.addInteract({ id: 'm:' + m.obj.id, obj: m.obj, label: m.konyoki ? 'Kyūri machine' : 'Machine', use: () => ({ x: m.x, z: m.z + 0.52, yaw: Math.PI }), onUse: () => (day.carrying ? day.refill(m) : g.bubbles.say(P, m.stock > 0.08 ? '(Still has capsules.)' : '(Empty. Capsules from the stock box...)', { kind: 'thought', silent: true, auto: 1.2 })) });
  }
  L.addInteract({ id: 'toybox', obj: L.toyBox, label: 'Stock box', use: { x: L.toyBox.position.x + 0.05, z: L.toyBox.position.z + 0.6, yaw: Math.PI }, onUse: () => day.takeBag() });
  day.open = true; day.maxCustomers = 6; day.spawnT = 2;
  let secretFound = false, manekiWoke = false, busy = false, lastEmpty = 0;
  const startH = day.happiness;
  const wakeAt = Math.max(50, startH + 14);
  day.onEvent = async (name, d) => {
    if (name === 'empty' && g.time - lastEmpty > 10) { lastEmpty = g.time; g.bubbles.say(G, d.m.konyoki ? 'The kyūri machine\'s empty! Restock it!' : 'One\'s empty, Mamoru!', { auto: 1.4, ambient: true }); }
    if (name === 'discover' && d.variant.id === 'shacho' && !secretFound) {
      secretFound = true;
      const c = d.cu.c;
      L.cabinet.userData.setSlot(5, konyokiFigure('kyuriOffice', 'shacho'));
      g.audio?.play?.('fanfare', { volume: 0.6 });
      g.bubbles.say(c, 'THE GOLDEN ONE!! I GOT THE GOLDEN ONE!!', { kind: 'shout', auto: 2.0, ambient: true });
      setTimeout(() => g.bubbles.say(M, 'NO WAY!! The secret!!', { auto: 1.6, ambient: true }), 900);
      setTimeout(() => g.bubbles.say(G, 'Ho ho! The Golden President! Into the book of legends!', { auto: 2.0, ambient: true }), 2000);
      g.particles?.emit('sparkle', { x: L.cabinet.position.x, y: 1.6, z: L.cabinet.position.z, n: 10 });
    }
  };
  const autoRestock = setInterval(async () => {
    if (!g.autoPlay || g.busyUse || busy || !day.empty().length) return;
    const m = day.empty()[0];
    if (!day.carrying) await g.useInteractable(L.getInteract('toybox'));
    await g.useInteractable(L.getInteract('m:' + m.obj.id));
  }, 2500);
  const autoCatch = setInterval(() => { if (g.autoPlay && !manekiWoke) for (const s of day.waiting()) if (s.state === 'rest') day.collect(s); }, 700);
  const dayLen = 120, t0 = g.time;
  await until(() => {
    const k = Math.min(1, (g.time - t0) / dayLen);
    L.hourOverride = 9 + k * 8;
    if (k > 0.6 && !secretFound) day.luck = 60; // the secret turns up before closing, one way or another
    // the jar passes half full: the maneki-neko wakes
    if (!manekiWoke && !busy && day.happiness >= wakeAt && !g.busyUse) {
      busy = true;
      (async () => {
        await D.cutscene(async () => {
          day.open = false;
          const mn = L.maneki;
          await D.cam({ x: mn.position.x - 0.3, y: 1.15, z: mn.position.z + 0.3, wupp: 0.0045, pitch: 18, dur: 1.0, clip: 1.2 });
          g.audio?.play?.('magicRise', { volume: 0.5 });
          g.particles?.emit('sparkle', { x: L.jar.position.x, y: 1.4, z: L.jar.position.z, n: 10 });
          await D.wait(0.6);
          await D.flash(0xfff0c0, 0.5);
          day.wakeManeki();
          mn.scale.setScalar(0.88); setTimeout(() => mn.scale.setScalar(0.8), 180);
          await D.say(mn, 'Nyaa~♪', { kind: 'spirit', auto: 1.0, name: '' });
          P.setExpr('shocked'); D.emote(P, 'excl');
          await D.cam({ x: 2.6, y: 1.0, z: -0.7, wupp: 0.0075, pitch: 22, dur: 0.8, clip: 1.6 });
          await D.say(P, 'The cat. The cat just MEOWED.', { kind: 'shout', expr: 'shocked' });
          G.setExpr('joy');
          await D.say(G, 'Ho ho! She\'s awake! Forty years asleep! Once the jar\'s half full, the old girl wakes up.', { expr: 'joy' });
          await D.say(G, 'She beckons the customers in, and gathers up any Happiness we miss. Isn\'t that right?', { expr: 'gentle' });
          await D.say(mn, 'Nya!', { kind: 'spirit', auto: 0.7, name: '' });
          P.setExpr('smile');
          await D.think(P, '(...Of course she does.)', { auto: 1.2 });
          day.open = true; day.maxCustomers = 7;
          D.follow(P);
        });
        manekiWoke = true; busy = false;
      })();
    }
    return k >= 1 && !busy;
  });
  clearInterval(autoRestock);
  day.open = false;
  await until(() => day.customers.length === 0 || g.time - t0 > dayLen + 30);
  for (const s of day.waiting()) day.collect(s);
  clearInterval(autoCatch);
  for (const it of [...L.interactables]) L.removeInteract(it.id);
  if (!secretFound) { g.state.collection.kyuriOffice = [...new Set([...g.state.collection.kyuriOffice, 'shacho'])]; L.refreshCollection(); }
  if (!manekiWoke) day.wakeManeki();
  // ---- closing: Yuki with a bento
  D.mark('yuki');
  const Y = new Character(CHARACTERS.yuki);
  await D.cutscene(async () => {
    if (day.carrying) { P.drop('both'); day.carrying = null; P.stopAction(); }
    if (L.chars.has(M)) L.remove(M);
    L.hourOverride = 17.6;
    await D.walk(P, 0.2, 1.4, { nav: L.nav });
    g.audio?.play?.('doorBell', { volume: 0.6 });
    L.add(Y); Y.setPos(0.9, 3.6); Y.faceNow(Math.PI);
    Y.setExpr('smile', { react: false });
    await Y.walkTo(0.85, 1.9);
    P.faceTo(Y.x, Y.z); Y.faceTo(P.x, P.z);
    await D.cam({ x: 0.5, y: 0.8, z: 1.7, wupp: 0.0068, pitch: 22, dur: 1.0, clip: 1.6 });
    await D.say(Y, 'Delivery from Bendy\'s~! Dad said you two forget to eat when you\'re busy.', { expr: 'happy', act: 'holdOut', name: 'Yuki' });
    P.setExpr('surprised');
    await D.say(P, '...Thanks. That\'s really nice of him.', { expr: 'shy' });
    Y.lookAt({ x: L.cabinet.position.x, y: 1.2, z: L.cabinet.position.z }, 1);
    Y.setExpr('surprised');
    await D.say(Y, 'Wait, are those the new capsules? Everyone at the restaurant was talking about them!', { expr: 'excited', name: 'Yuki' });
    Y.lookAt(null);
    P.setExpr('shy');
    await D.say(P, '...Do you want to try one? On me.', { expr: 'shy' });
    Y.setExpr('joy'); D.emote(Y, 'heart');
    // she turns the crank; she gets the Office Lady
    Y.walkTo(km.x, km.z + 0.48, { nav: L.nav }).then(() => Y.faceYaw(Math.PI));
    P.walkTo(km.x + 0.55, km.z + 0.7, { nav: L.nav });
    await D.wait(2.2);
    await D.cam({ x: km.x + 0.25, y: 0.8, z: km.z + 0.6, wupp: 0.0062, pitch: 22, dur: 0.8, clip: 1.6 });
    Y.play('crank', { turns: 1, dur: 1.4, onClick: () => g.audio?.play?.('crankTick', { volume: 0.45 }) });
    await D.wait(1.6);
    g.audio?.play?.('capsulePop', { volume: 0.6 });
    const ol = konyokiFigure('kyuriOffice', 'ol'); L.scene.add(ol);
    const hp = Y.headPos(new THREE.Vector3()); ol.position.set(hp.x, hp.y + 0.05, hp.z + 0.12); ol.scale.setScalar(1.3);
    Y.faceYaw(0.4);
    Y.setExpr('joy');
    await D.say(Y, 'Aww! She has a little bow! She looks like me!', { expr: 'joy', name: 'Yuki' });
    day.burst(Y, 4);
    P.setExpr('smile');
    await D.say(P, '...Yeah. She kind of does.', { expr: 'smile' });
    Y.setExpr('flustered'); D.emote(Y, 'heart');
    await D.wait(0.8);
    L.scene.remove(ol);
    Y.faceTo(P.x, P.z);
    Y.setExpr('shy');
    await D.say(Y, 'Um— come by Bendy\'s sometime. Not with your grandpa. I mean— also with your grandpa! For omurice!', { expr: 'flustered', name: 'Yuki' });
    P.setExpr('flustered');
    await D.say(P, '...Okay. I will.', { expr: 'shy' });
    Y.play('wave');
    Y.walkTo(0.9, 3.8, { run: true }).then(() => L.remove(Y));
    await D.wait(1.4);
    // Grandpa saw everything
    L.maneki.userData.awake = true;
    await D.cam({ x: 2.6, y: 1.0, z: -0.7, wupp: 0.0075, pitch: 22, dur: 0.8, clip: 1.6 });
    G.setExpr('smug');
    await D.say(G, 'Hmhmhm. "Okay. I will."', { expr: 'smug' });
    P.setExpr('flustered'); D.emote(P, 'sweat');
    await D.say(P, 'GRANDPA.', { kind: 'shout', expr: 'flustered' });
    G.setExpr('laugh');
    await D.say(G, `Ho ho ho! Closing time! ¥${day.yen.toLocaleString()}, a golden secret, and a cat who\'s awake again. What a day!`, { expr: 'laugh' });
    await D.cam({ x: L.cabinet.position.x, y: 1.1, z: L.cabinet.position.z + 0.6, wupp: 0.0058, pitch: 18, dur: 1.2, clip: 1.4 });
    await D.wait(1.0);
    await D.fadeOut(1.4);
    L.remove(G);
    L.day = null;
    await D.title('Day 4', 'Kodamaya is back', 2.4);
  });
}
