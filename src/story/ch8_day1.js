// Chapter 8 — Day 1 at Kodamaya (the shop tutorial, then a real day).
// Morning: Grandpa behind the counter, three machines empty. Fetch capsule
// bags from the stock box and pour them in. Then the shop opens; the first
// kid turns a crank, twists a capsule open, and bursts with Happiness — little
// glowing konpeito stars. "Catch it before it fades!" Tap or swipe them into
// the jar. After that it's a real day: kids, parents, empty machines to
// refill, stars to catch, until closing time and the jar glows on the counter.
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { ShopDay } from '../game/shopDay.js';

export async function day1Chapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('kodamaya', {}, { transition: null });
  L.setDay(10);
  const day = (L.day = new ShopDay(g, L));
  // three machines run dry overnight; the rest are part-full
  const empties = [day.machines[1], day.machines[4], day.machines[9]].filter(Boolean);
  for (const m of day.machines) day.setStock(m, 0.45 + Math.random() * 0.5);
  for (const m of empties) day.setStock(m, 0);
  const G = new Character(CHARACTERS.genzo);
  const until = (fn) => new Promise((res) => { const t = setInterval(() => { if (fn()) { clearInterval(t); res(); } }, 150); });
  // ---- morning
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.add(G); G.setPos(3.05, -1.55); G.faceNow(0.2);
    g.place(P, -4.1, -1.9, Math.PI / 2);
    P.setHood(true); P.setExpr('sleepy', { react: false });
    D.cam({ x: 0, y: 1.0, z: 0.4, wupp: 0.0122, pitch: 34, dur: 0 });
    await D.fadeIn(1.0);
    g.audio?.music?.('shopDay', { volume: 0.5 });
    await D.walk(P, -3.7, 1.95, { free: true });
    P.play('yawn');
    G.play('wave');
    await D.say(G, 'Morning, Mamoru! Sleep well?', { expr: 'happy' });
    P.setExpr('tired');
    await D.say(P, '...Kind of.', { expr: 'tired' });
    await D.say(G, 'Big day today! First things first — a few machines ran dry. The capsules are in the stock box. Fill \'em up!', { expr: 'determined', act: 'point' });
    g.particles?.emit('sparkle', { x: L.toyBox.position.x, y: 0.8, z: L.toyBox.position.z, n: 8 });
    D.follow(P);
  });
  // ---- restock tutorial (free play)
  D.mark('restock');
  const addMachineInteracts = () => {
    for (const m of day.machines) {
      L.addInteract({ id: 'm:' + m.obj.id, obj: m.obj, label: 'Machine', use: () => ({ x: m.x, z: m.z + 0.52, yaw: Math.PI }), onUse: () => (day.carrying ? day.refill(m) : g.bubbles.say(P, m.stock > 0.08 ? '(This one still has capsules.)' : '(Empty. I need capsules from the stock box.)', { kind: 'thought', silent: true, auto: 1.2 })) });
    }
    L.addInteract({ id: 'toybox', obj: L.toyBox, label: 'Stock box', use: { x: L.toyBox.position.x + 0.05, z: L.toyBox.position.z + 0.6, yaw: Math.PI }, onUse: () => day.takeBag() });
  };
  addMachineInteracts();
  // dev / tests: restock by itself
  const autoRestock = async () => {
    for (let i = 0; i < 40 && day.empty().length; i++) {
      const m = day.empty()[0];
      if (!day.carrying) await g.useInteractable(L.getInteract('toybox'));
      await g.useInteractable(L.getInteract('m:' + m.obj.id));
      await D.wait(0.3);
    }
  };
  if (g.autoPlay) autoRestock();
  let hinted = false;
  const hint = setInterval(() => { if (!hinted && !day.carrying && day.empty().length) { hinted = true; g.bubbles.say(G, 'The stock box is by the stairs!', { auto: 1.6, ambient: true }); } }, 12000);
  await until(() => day.empty().length === 0 && !g.busyUse);
  clearInterval(hint);
  // ---- open for business
  D.mark('open');
  await D.cutscene(async () => {
    D.cam({ x: 1.2, y: 1.0, z: 0.0, wupp: 0.0105, pitch: 30, dur: 1.0 });
    G.setExpr('joy');
    await D.say(G, 'Perfect! Now then...', { expr: 'joy' });
    g.audio?.play?.('doorBell', { volume: 0.6 });
    await D.say(G, 'Kodamaya is OPEN!', { expr: 'excited', act: 'cheer' });
  });
  D.follow(P);
  // the first customer is a little girl with one coin
  const first = day.spawnCustomer({ role: 'kid', x: -0.3, plays: 1 });
  let burstSeen = false;
  day.onEvent = (name, d) => { if (name === 'burst' && !burstSeen) burstSeen = true; };
  await until(() => burstSeen);
  D.mark('happiness');
  await D.cutscene(async () => {
    await D.cam({ x: first.c.x, y: 0.9, z: first.c.z, wupp: 0.0075, pitch: 24, dur: 0.8, clip: 1.6 });
    P.setExpr('surprised');
    D.emote(P, 'excl');
    await D.say(G, 'Look! See that? That\'s *Happiness*!', { expr: 'excited' });
    await D.say(G, 'Quick, catch it before it fades — tap the stars, or swipe across them!', { expr: 'determined' });
  });
  D.follow(P);
  const before = day.happiness;
  const autoCatch = setInterval(() => { if (g.autoPlay) for (const s of day.waiting()) if (s.state === 'rest') day.collect(s); }, 700);
  await until(() => day.happiness - before >= 2 || (day.waiting().length === 0 && day.happiness - before >= 1) || day.waiting().length === 0);
  await D.cutscene(async () => {
    await D.cam({ x: L.jar.position.x, y: 1.15, z: L.jar.position.z + 0.2, wupp: 0.004, pitch: 18, dur: 1.0, clip: 1.0 });
    g.audio?.play?.('sparkle', { volume: 0.4 });
    await D.say(G, 'That\'s the stuff. A child\'s happiness — the real kind. We keep it in the jar.', { expr: 'gentle' });
    P.setExpr('confused');
    await D.say(P, '...You keep... happiness. In a jar.', { expr: 'confused' });
    G.setExpr('smug');
    await D.say(G, 'Ho ho. You\'ll see.', { expr: 'smug' });
  });
  // ---- the rest of the day (free play): customers come and go, machines run dry
  D.mark('day');
  D.follow(P);
  day.open = true;
  day.maxCustomers = 4;
  day.spawnT = 2;
  let lastEmptyCall = 0;
  day.onEvent = (name, d) => {
    if (name === 'empty' && g.time - lastEmptyCall > 10) { lastEmptyCall = g.time; g.bubbles.say(G, 'Mamoru! That one\'s empty!', { auto: 1.4, ambient: true }); }
  };
  const autoDay = setInterval(() => { if (g.autoPlay && !g.busyUse && day.empty().length) autoRestock(); }, 2500);
  const dayLen = 150; // seconds of shop time from 10:00 to 17:00
  const t0 = g.time;
  await until(() => {
    const k = Math.min(1, (g.time - t0) / dayLen);
    L.hourOverride = 10 + k * 7;
    return k >= 1;
  });
  clearInterval(autoDay);
  // ---- closing time
  D.mark('close');
  day.open = false;
  await until(() => day.customers.length === 0 || g.time - t0 > dayLen + 30);
  for (const s of day.waiting()) day.collect(s);
  clearInterval(autoCatch);
  for (const it of [...L.interactables]) L.removeInteract(it.id);
  await D.cutscene(async () => {
    if (day.carrying) { P.drop('both'); day.carrying = null; P.stopAction(); }
    await D.walk(P, 2.0, -0.2, { nav: L.nav });
    P.faceTo(G.x, G.z);
    await D.cam({ x: 2.6, y: 1.0, z: -0.8, wupp: 0.0072, pitch: 22, dur: 1.4, clip: 1.6 });
    G.setExpr('happy');
    await D.say(G, 'And that\'s closing time! Well done, Mamoru.', { expr: 'happy' });
    G.play('crank', { turns: 2, dur: 1.2 });
    g.audio?.play?.('register', { volume: 0.6 });
    await D.wait(1.2);
    await D.say(G, `¥${day.yen.toLocaleString()}... not bad at all for a first day.`, { expr: 'proud' });
    await D.cam({ x: L.jar.position.x, y: 1.15, z: L.jar.position.z + 0.2, wupp: 0.004, pitch: 18, dur: 1.2, clip: 1.0 });
    await D.wait(0.6);
    await D.say(G, '...And look at that jar.', { expr: 'gentle' });
    P.setExpr('calm');
    await D.think(P, '(It\'s glowing. Like it\'s warm.)', { auto: 1.8 });
    await D.cam({ x: 2.6, y: 1.0, z: -0.8, wupp: 0.0072, pitch: 22, dur: 1.0, clip: 1.6 });
    G.setExpr('nostalgic');
    await D.say(G, '...Get some rest. Tonight I\'ve got something to show you.', { expr: 'nostalgic' });
    P.setExpr('confused');
    D.emote(P, 'interro');
    await D.wait(1.0);
    await D.fadeOut(1.4);
    L.remove(G);
    L.day = null;
  });
}
