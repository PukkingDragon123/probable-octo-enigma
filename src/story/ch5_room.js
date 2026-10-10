// Chapter 5 — Mamo's room (the cleaning tutorial).
// The room upstairs is a storeroom: boxes, dust, a window that sticks.
// Tap a box to carry it into the oshiire; tap the dust to sweep it up (the
// first clump blinks two googly eyes at him before it poofs — he decides he
// imagined it); open the window; lay out the futon. Then a message from Mom,
// and Grandpa calling up the stairs: dinner at Bendy's.
const sleep = (D, s) => D.wait(s);

export async function roomChapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('mamoroom', {}, { transition: null });
  const downstairs = { x: -3.3, y: 0.5, z: 2.2 };
  const grandpaCalls = (text, o = {}) => g.bubbles.say(null, text, { anchor: downstairs, name: 'Grandpa (downstairs)', auto: o.auto ?? 2.4, ...o });
  // ---- intro
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    g.place(P, -3.0, 1.95, Math.PI / 2);
    P.setHood(true); P.setExpr('neutral', { react: false });
    D.cam({ x: -1.0, y: 1.0, z: 0.6, wupp: 0.0098, pitch: 36, dur: 0 });
    await D.fadeIn(1.0);
    g.audio?.music?.('room', { volume: 0.5 });
    P.play('lookAround');
    await D.wait(1.4);
    P.setExpr('tired');
    await D.think(P, '...This is my room?', { auto: 1.6 });
    P.play('sigh');
    await D.wait(0.6);
    await grandpaCalls('Sorry about the mess! Just put everything in the oshiire, it\'ll fit!', { auto: 2.6 });
    await D.think(P, '(Okay. Boxes first.)', { auto: 1.4 });
    D.follow(P);
  });
  // ---- the tutorial: free play until everything is done
  D.mark('clean');
  const done = { boxes: 0, dust: 0, window: false, futon: false };
  let lastProgress = g.time, firstDust = true, closetOpen = false;
  const progress = () => { lastProgress = g.time; };
  const openCloset = async () => {
    if (closetOpen) return;
    closetOpen = true;
    g.audio?.play?.('slide', { volume: 0.5 });
    const f = L.fusuma[1];
    await D.tween((k) => { f.m.position.x = f.x0 - k * 0.86; }, 0.6);
  };
  const remove = (id) => L.removeInteract(id);
  let slot = 0;
  const carry = async (b) => {
    P.stopAction();
    P.play('pickup', { dur: 0.8 });
    await sleep(D, 0.4);
    L.scene.remove(b.obj);
    P.hold(b.obj, 'both');
    b.obj.position.set(0, -0.32, 0.06); b.obj.rotation.set(0, 0, 0);
    b.done = true; L.boxNav();
    remove(b.id);
    g.audio?.play?.('boxLift', { volume: 0.45 });
    await sleep(D, 0.4);
    P.play('carry', { loop: true });
    const s = L.closet.slots[slot++ % L.closet.slots.length];
    await P.walkTo(Math.min(-1.4, Math.max(-3.2, s.x)), L.closet.z, { nav: L.nav });
    P.faceYaw(Math.PI);
    await openCloset();
    P.play('putdown', { dur: 0.8 });
    await sleep(D, 0.45);
    const box = P.drop('both');
    L.scene.add(box);
    box.position.set(s.x, s.y, s.z); box.rotation.set(0, (Math.random() - 0.5) * 0.15, 0); box.scale.setScalar(0.92);
    g.audio?.play?.('boxDrop', { volume: 0.4 });
    P.stopAction();
    done.boxes++; progress();
    if (done.boxes === 3) P.setExpr('determined');
    if (done.boxes === L.boxes.length) await D.think(P, '(Boxes... done.)', { auto: 1.2 });
  };
  const sweep = async (b) => {
    remove(b.id);
    P.play('pickup', { dur: 1.0 });
    await sleep(D, 0.35);
    const eyes = b.obj.userData.eyes;
    if (firstDust) {
      firstDust = false;
      // it looks at him
      eyes.visible = true;
      g.audio?.play?.('pop', { volume: 0.4, pitch: 1.6 });
      P.stopAction();
      P.setExpr('shocked');
      P.squash(0.3);
      D.emote(P, 'excl');
      await D.cam({ x: b.obj.position.x, y: 0.35, z: b.obj.position.z + 0.2, wupp: 0.0045, pitch: 18, dur: 0.5, clip: 1.2 });
      b.obj.scale.set(1.15, 0.9, 1.15);
      await sleep(D, 0.25); b.obj.scale.set(1, 1, 1);
      await sleep(D, 0.9);
      g.particles?.emit('dustPuff', { x: b.obj.position.x, y: 0.15, z: b.obj.position.z, n: 8 });
      g.audio?.play?.('poof', { volume: 0.5 });
      L.scene.remove(b.obj);
      await sleep(D, 0.6);
      D.follow(P);
      P.setExpr('confused');
      await D.think(P, '...Did that dust just... blink at me?', { auto: 1.8 });
      P.setExpr('tired');
      await D.think(P, '(I really need to sleep.)', { auto: 1.4 });
    } else {
      eyes.visible = Math.random() < 0.5;
      await sleep(D, 0.25);
      g.particles?.emit('dustPuff', { x: b.obj.position.x, y: 0.12, z: b.obj.position.z, n: 6 });
      g.audio?.play?.('poof', { volume: 0.4 });
      L.scene.remove(b.obj);
    }
    b.done = true; done.dust++; progress();
  };
  for (const b of L.boxes) L.addInteract({ id: b.id, obj: b.obj, label: 'Box', use: () => ({ x: b.obj.position.x, z: b.obj.position.z + 0.5, yaw: Math.PI }), onUse: () => carry(b) });
  for (const b of L.bunnies) L.addInteract({ id: b.id, obj: b.obj, label: 'Dust', use: () => ({ x: b.obj.position.x, z: b.obj.position.z + 0.42, yaw: Math.PI }), onUse: () => sweep(b) });
  // hints: if nothing happens for a while, a sparkle over the nearest job (and a nudge from downstairs once)
  let nudged = false;
  const hintTimer = setInterval(() => {
    if (g.time - lastProgress < 9 || D.inCutscene) return;
    lastProgress = g.time - 4;
    const left = [...L.boxes, ...L.bunnies].filter((b) => !b.done);
    let best = null, bd = 1e9;
    for (const b of left) { const dd = Math.hypot(b.obj.position.x - P.x, b.obj.position.z - P.z); if (dd < bd) { bd = dd; best = b; } }
    if (best) g.particles?.emit('sparkle', { x: best.obj.position.x, y: 0.7, z: best.obj.position.z, n: 5 });
    if (!nudged) { nudged = true; grandpaCalls('Just tap a box and carry it over!', { auto: 2.2 }); }
  }, 1000);
  // dev / tests: ?auto=1 plays the tutorial by itself
  const auto = async () => {
    for (let guard = 0; guard < 200; guard++) {
      const next = [...L.boxes, ...L.bunnies].find((b) => !b.done && L.getInteract(b.id));
      if (!next) break;
      if (!g.busyUse && !D.inCutscene) await g.useInteractable(L.getInteract(next.id));
      await sleep(D, 0.3);
    }
  };
  if (g.autoPlay) auto();
  // wait for boxes + dust
  await new Promise((res) => { const t = setInterval(() => { if (done.boxes >= L.boxes.length && done.dust >= L.bunnies.length && !g.busyUse) { clearInterval(t); res(); } }, 200); });
  // ---- the window
  D.mark('window');
  await D.think(P, '(It\'s stuffy in here. The window...)', { auto: 1.6 });
  await new Promise((res) => {
    L.addInteract({ id: 'window', obj: L.pane, label: 'Window', use: { x: 1.15, z: -0.95, yaw: Math.PI }, onUse: async () => {
      L.removeInteract('window');
      P.play('wipe', { dur: 1.2, height: 0.9 });
      g.audio?.play?.('slide', { volume: 0.6, pitch: 0.8 });
      await sleep(D, 0.3);
      await D.tween((k) => { L.pane.position.x = 1.5 - k * 0.78; }, 1.0);
      L.windowOpen = true;
      g.audio?.ambience?.('nightStreet');
      P.setExpr('calm');
      await D.think(P, '...Cicadas. And someone\'s TV.', { auto: 1.6 });
      res();
    } });
    if (g.autoPlay) setTimeout(() => g.useInteractable(L.getInteract('window')), 800);
  });
  // ---- the futon
  D.mark('futon');
  await new Promise((res) => {
    L.addInteract({ id: 'futon', obj: L.futonRoll, label: 'Futon', use: { x: 2.0, z: 1.85, yaw: Math.PI / 2 }, onUse: async () => {
      L.removeInteract('futon');
      P.play('pickup', { dur: 1.0 });
      await sleep(D, 0.5);
      g.audio?.play?.('cloth', { volume: 0.5 });
      L.futonRoll.visible = false; L.futonFlat.visible = true;
      g.particles?.emit('dustPuff', { x: 0.3, y: 0.1, z: 0.3, n: 5 });
      res();
    } });
    if (g.autoPlay) setTimeout(() => g.useInteractable(L.getInteract('futon')), 800);
  });
  clearInterval(hintTimer);
  // ---- done: a message from Mom, then dinner
  D.mark('mom');
  await D.cutscene(async () => {
    await P.walkTo(0.3, 0.75, { nav: null });
    P.faceYaw(0);
    P.setPose('sit');
    P.y = 0.06;
    await D.cam({ x: 0.3, y: 0.55, z: 0.75, wupp: 0.0058, pitch: 22, dur: 1.6, clip: 1.4 });
    g.audio?.play?.('phoneBuzz', { volume: 0.5 });
    D.emote(P, 'note');
    P.play('phone', { loop: true });
    await sleep(D, 0.8);
    await D.caption('Mom: Did you get there okay? Eat properly. Grandpa is happy you came.', { dur: 3.6, kind: 'phone' });
    P.setExpr('sad');
    await sleep(D, 0.6);
    await D.think(P, '"yeah."', { auto: 1.0 });
    await D.think(P, '...', { auto: 0.8 });
    await D.think(P, '"yeah. it\'s fine. the room\'s ok."', { auto: 1.6 });
    g.audio?.play?.('phoneSend', { volume: 0.4 });
    P.setExpr('calm');
    await sleep(D, 0.8);
    await grandpaCalls('Mamoru! Dinner! We\'re going to Bendy\'s — I\'m starving!', { auto: 2.4 });
    P.stopAction();
    P.setPose('stand'); P.y = 0;
    P.setExpr('neutral');
    await D.think(P, '...Coming.', { auto: 1.0 });
    await D.fadeOut(1.0);
  });
}
