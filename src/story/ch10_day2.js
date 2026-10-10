// Chapter 10 — Day 2 at Kodamaya.
// A schoolgirl otter crashes through the door, late for school, trips over
// nothing and sprays coins across the floor. Mamo picks them up for her
// (tap the coins). Mio — "I'm Mio! Second year!" — spends her very last coin
// on a capsule, gets the rare secret, bursts with Happiness, shrieks, and
// sprints off to school. Then a busy day of customers, and at closing Grandpa
// reminds him: tonight, tea for Tarōbō.
import * as THREE from 'three';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { ShopDay, capsuleMesh, toyMesh } from '../game/shopDay.js';
import { VoxelModel, vm, V25 } from '../world/build.js';

function coinMesh() {
  const v = new VoxelModel();
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z <= 10) { v.set(x, 0, z, (x + z) % 3 === 0 ? 0xfff0a0 : 0xe8c040); }
  v.set(0, 1, 0, 0xc89a20);
  return vm(v, V25, [0.5, 0, 0.5]);
}

export async function day2Chapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('kodamaya', {}, { transition: null });
  L.setDay(9.5);
  const day = (L.day = new ShopDay(g, L));
  for (const m of day.machines) day.setStock(m, 0.6 + Math.random() * 0.4);
  const G = new Character(CHARACTERS.genzo);
  const M = new Character(CHARACTERS.mio);
  const until = (fn) => new Promise((res) => { const t = setInterval(() => { if (fn()) { clearInterval(t); res(); } }, 150); });
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.add(G); G.setPos(3.05, -1.55); G.faceNow(0.2);
    g.place(P, 0.4, 1.3, Math.PI);
    P.setHood(true); P.setExpr('neutral', { react: false });
    D.cam({ x: 0.4, y: 1.0, z: 0.6, wupp: 0.0118, pitch: 32, dur: 0 });
    await D.fadeIn(1.0);
    D.caption('Day 2', { dur: 2.0, kind: 'place' });
    g.audio?.music?.('shopDay', { volume: 0.5 });
    await D.say(G, 'Morning! Day two. Feels good to have the doors open, eh?', { expr: 'happy' });
    // running footsteps from the street
    D.mark('mio');
    g.audio?.play?.('footstepsRun', { volume: 0.6 });
    L.add(M); M.setPos(-1.6, 3.6); M.faceNow(Math.PI);
    M.setExpr('flustered', { react: false });
    await D.say(M, 'Ahh— excuse me, one gacha, really quick, I\'m SO late—', { expr: 'flustered', name: '???', auto: 1.2 });
    P.faceTo(M.x, M.z);
    await M.walkTo(-0.6, 1.6, { run: true });
    // ...and she trips over absolutely nothing
    M.play('trip');
    g.audio?.play?.('trip', { volume: 0.6 });
    D.shake(0.15);
    M.setExpr('shocked');
    const coins = [];
    for (let i = 0; i < 5; i++) {
      const c = coinMesh(); L.scene.add(c);
      const a = (i / 5) * Math.PI * 2 + 0.3, r = 0.45 + (i % 2) * 0.35;
      const tx = M.x + Math.cos(a) * r, tz = M.z + 0.3 + Math.sin(a) * r * 0.7;
      c.position.set(M.x, 0.5, M.z);
      D.tween((k) => { c.position.set(M.x + (tx - M.x) * k, 0.5 * (1 - k) + Math.sin(k * Math.PI) * 0.35 + 0.01, M.z + (tz - M.z) * k); c.rotation.z = k * 9; }, 0.6 + i * 0.08).then(() => c.rotation.set(0, i, 0));
      coins.push({ m: c, id: 'coin' + i, done: false });
      g.audio?.play?.('coin', { volume: 0.3, pitch: 1 + i * 0.1 });
    }
    await D.wait(1.0);
    await D.cam({ x: M.x + 0.3, y: 0.7, z: M.z + 0.3, wupp: 0.0075, pitch: 26, dur: 0.8, clip: 1.6 });
    M.setExpr('crying');
    await D.say(M, 'Nooo, my coins! My whole week\'s allowance!', { expr: 'crying', name: '???' });
    P.setExpr('surprised');
    await D.think(P, '(...I should help her.)', { auto: 1.2 });
    D.follow(P);
    // tap the coins
    for (const c of coins) L.addInteract({ id: c.id, obj: c.m, label: 'Coin', use: () => ({ x: c.m.position.x, z: c.m.position.z + 0.3, yaw: Math.PI }), onUse: async () => {
      L.removeInteract(c.id);
      P.play('pickup', { dur: 0.7 });
      await D.wait(0.35);
      L.scene.remove(c.m); c.done = true;
      g.audio?.play?.('coin', { volume: 0.4, pitch: 1.3 });
    } });
  });
  // (free) pick up the coins
  if (g.autoPlay) (async () => { for (const c of coins_()) { const it = L.getInteract(c.id); if (it) await g.useInteractable(it); } })();
  function coins_() { return L.interactables.filter((i) => i.id.startsWith('coin')).map((i) => ({ id: i.id })); }
  await until(() => !L.interactables.some((i) => i.id.startsWith('coin')) && !g.busyUse);
  await D.cutscene(async () => {
    await P.walkTo(M.x + 0.7, M.z - 0.05, { nav: L.nav });
    P.faceYaw(-Math.PI / 2 + 0.5); M.faceYaw(Math.PI / 2 - 0.5);
    M.setExpr('surprised');
    await D.cam({ x: (P.x + M.x) / 2, y: 0.75, z: M.z, wupp: 0.007, pitch: 22, dur: 1.0, clip: 1.6 });
    P.play('give', { dur: 0.9 });
    await D.wait(0.5);
    await D.say(P, '...Here. Five.', { expr: 'shy' });
    M.setExpr('joy');
    M.play('jump');
    await D.say(M, 'You\'re a lifesaver!! Thank you thank you!', { expr: 'joy', name: '???' });
    M.play('bow', { deep: true });
    await D.say(M, 'I\'m Mio! Second year at Kodama High! Are you new? I\'ve never seen you!', { expr: 'excited', name: 'Mio' });
    P.setExpr('awkward');
    await D.say(P, '...Mamoru. I just moved here. It\'s my grandpa\'s shop.', { expr: 'awkward' });
    M.setExpr('love');
    D.emote(M, 'sparkle');
    await D.say(M, 'Whaaat! Kodamaya\'s grandson! I\'ve been coming here since I was THIS big!', { expr: 'excited', act: 'holdOut' });
    // her last coin: the cat series, please
    D.mark('gacha');
    const mach = day.machines[2];
    mach.queue = { c: M };
    M.walkTo(mach.x, mach.z + 0.48, { nav: L.nav }).then(() => M.faceYaw(Math.PI));
    await D.wait(1.6);
    await D.cam({ x: mach.x, y: 0.8, z: mach.z + 0.6, wupp: 0.0065, pitch: 24, dur: 0.8, clip: 1.6 });
    await D.say(M, 'Please please please, the secret one...', { expr: 'determined', auto: 1.0 });
    M.play('insertCoin', { onInsert: () => day.addYen(200) });
    await D.wait(0.8);
    M.play('crank', { turns: 1, dur: 1.4, onClick: () => g.audio?.play?.('crankTick', { volume: 0.45 }) });
    await D.wait(1.5);
    // a golden capsule!
    const cap = capsuleMesh(0xf8d040);
    L.scene.add(cap);
    const tray = mach.obj.userData.tray;
    cap.position.set(mach.x + tray.x, tray.y, mach.z + tray.z + 0.02);
    g.audio?.play?.('capsuleDrop', { volume: 0.55 });
    g.particles?.emit('sparkle', { x: cap.position.x, y: cap.position.y + 0.1, z: cap.position.z, n: 8 });
    await D.wait(0.6);
    L.scene.remove(cap); M.hold(cap, 'R'); cap.position.set(0, -0.02, 0.05);
    M.faceYaw(0);
    M.play('openCapsule', { onPop: () => {
      g.audio?.play?.('capsulePop', { volume: 0.6 });
      cap.userData.top.position.y = 0.06; cap.userData.top.rotation.z = 0.8;
      const toy = toyMesh(7); L.scene.add(toy);
      const hp = M.headPos(new THREE.Vector3()); toy.position.set(hp.x, hp.y + 0.08, hp.z + 0.1);
      setTimeout(() => L.scene.remove(toy), 3200);
    } });
    await D.wait(1.8);
    M.setExpr('excited');
    M.play('jump');
    D.emote(M, 'bigheart');
    await D.shout(M, 'THE SECRET ONE!!! KYAAAA!!', { expr: 'excited', name: 'Mio' });
    day.burst(M, 7);
    mach.queue = null;
    P.setExpr('surprised');
    await D.wait(0.6);
    G.setExpr('laugh');
    await D.say(G, 'Ho ho! Quick, Mamoru — catch it!', { expr: 'laugh' });
    D.follow(P);
  });
  // catch the stars
  const autoCatch = setInterval(() => { if (g.autoPlay) for (const s of day.waiting()) if (s.state === 'rest') day.collect(s); }, 600);
  await until(() => day.waiting().length === 0);
  await D.cutscene(async () => {
    g.audio?.play?.('schoolBell', { volume: 0.5 });
    M.setExpr('shocked');
    D.emote(M, 'excl');
    await D.say(M, 'The bell!! I\'m gonna be SO late!', { expr: 'shocked', name: 'Mio' });
    M.faceTo(P.x, P.z);
    M.setExpr('joy');
    await D.say(M, 'See you tomorrow, Mamoru-kun! Thank youuu!', { expr: 'joy', act: 'wave', name: 'Mio' });
    M.drop('R');
    M.walkTo(-1.2, 3.8, { run: true }).then(() => L.remove(M));
    await D.wait(1.4);
    P.setExpr('flustered');
    await D.think(P, '"See you tomorrow"...?', { auto: 1.4 });
    G.setExpr('smug');
    await D.say(G, 'Hmhmhm. Popular already.', { expr: 'smug' });
    P.setExpr('awkward');
    D.emote(P, 'sweat');
    await D.wait(0.8);
    G.setExpr('happy');
    await D.say(G, 'Right then — the morning rush! Keep those machines full!', { expr: 'determined', act: 'point' });
    D.follow(P);
  });
  // ---- the day (free play): restock, catch stars
  D.mark('day');
  for (const m of day.machines) {
    L.addInteract({ id: 'm:' + m.obj.id, obj: m.obj, label: 'Machine', use: () => ({ x: m.x, z: m.z + 0.52, yaw: Math.PI }), onUse: () => (day.carrying ? day.refill(m) : g.bubbles.say(P, m.stock > 0.08 ? '(This one still has capsules.)' : '(Empty. Capsules from the stock box...)', { kind: 'thought', silent: true, auto: 1.2 })) });
  }
  L.addInteract({ id: 'toybox', obj: L.toyBox, label: 'Stock box', use: { x: L.toyBox.position.x + 0.05, z: L.toyBox.position.z + 0.6, yaw: Math.PI }, onUse: () => day.takeBag() });
  day.open = true; day.maxCustomers = 5; day.spawnT = 1.5;
  let lastEmpty = 0;
  day.onEvent = (n) => { if (n === 'empty' && g.time - lastEmpty > 10) { lastEmpty = g.time; g.bubbles.say(G, 'One\'s empty, Mamoru!', { auto: 1.4, ambient: true }); } };
  const autoRestock = setInterval(async () => {
    if (!g.autoPlay || g.busyUse || !day.empty().length) return;
    const m = day.empty()[0];
    if (!day.carrying) await g.useInteractable(L.getInteract('toybox'));
    await g.useInteractable(L.getInteract('m:' + m.obj.id));
  }, 2500);
  const dayLen = 110, t0 = g.time;
  await until(() => { const k = Math.min(1, (g.time - t0) / dayLen); L.hourOverride = 9.5 + k * 7.5; return k >= 1; });
  clearInterval(autoRestock);
  day.open = false;
  await until(() => day.customers.length === 0 || g.time - t0 > dayLen + 30);
  for (const s of day.waiting()) day.collect(s);
  clearInterval(autoCatch);
  for (const it of [...L.interactables]) L.removeInteract(it.id);
  // ---- closing
  D.mark('close');
  await D.cutscene(async () => {
    if (day.carrying) { P.drop('both'); day.carrying = null; P.stopAction(); }
    await D.walk(P, 2.0, -0.2, { nav: L.nav });
    P.faceTo(G.x, G.z);
    await D.cam({ x: 2.6, y: 1.0, z: -0.8, wupp: 0.0072, pitch: 22, dur: 1.2, clip: 1.6 });
    await D.say(G, `Closing time! ¥${day.yen.toLocaleString()} today. And the jar's filling up nicely.`, { expr: 'proud' });
    await D.say(G, 'Now — tonight we owe Tarōbō-sama a pot of tea. A proper one. From leaf to cup.', { expr: 'determined' });
    P.setExpr('confused');
    await D.say(P, 'From... leaf?', { expr: 'confused' });
    G.setExpr('laugh');
    await D.say(G, 'Ho ho! You\'ll see. And you\'ll meet Kappei. Bring an appetite for cucumbers.', { expr: 'laugh' });
    await D.fadeOut(1.4);
    L.remove(G);
    L.day = null;
  });
}
