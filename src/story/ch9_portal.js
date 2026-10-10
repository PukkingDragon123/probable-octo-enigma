// Chapter 9 — the door under the stairs.
// After closing, Grandpa takes an old key on a kodama charm and peels the paper
// seal off the basement door. A cool green light pours out. They step through
// a torii into golden afternoon: Grandpa's island floating in a sea of clouds,
// his old house, a koi pond spilling off the edge. The house is thick with
// dust — and the dust has eyes. Hokori! Then a roar of wind: Tarōbō the Tengu
// drops out of the sky on a cloud, grumbling about forty years of silence,
// demands Happiness, and with one swing of his feather fan blows the cloud
// banks away — Kappa Island steaming on the horizon, his own castle on its peak.
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { Hokori } from '../entities/hokori.js';
import { cloudPuff } from '../world/spiritIsland.js';

export async function portalChapter(g) {
  const D = g.director;
  const P = g.player;
  // ---------------------------------------------------------------- the basement door
  let L = await g.goTo('kodamaya', {}, { transition: null });
  L.setDay(19.5);
  L.setLights(true);
  L.hourOverride = 20.5;
  let G = new Character(CHARACTERS.genzo);
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.add(G); G.setPos(-3.4, -1.9); G.faceNow(Math.PI);
    g.place(P, -2.6, -1.0, Math.PI + 0.6);
    P.setHood(true); P.setExpr('neutral', { react: false });
    D.cam({ x: -3.2, y: 1.0, z: -1.4, wupp: 0.0075, pitch: 20, dur: 0, clip: 1.8 });
    await D.fadeIn(1.0);
    g.audio?.music?.(null);
    await D.say(G, 'Mamoru. What I\'m about to show you... your father knew. Your grandmother knew.', { expr: 'nostalgic' });
    G.faceTo(P.x, P.z);
    await D.say(G, 'Try not to scream, eh?', { expr: 'smug' });
    P.setExpr('confused');
    G.faceYaw(Math.PI);
    // the key on its kodama charm, the seal peeled away
    G.play('pickup', { dur: 0.8 });
    await D.wait(0.5);
    g.audio?.play?.('paperTear', { volume: 0.5 });
    L.basement.children.forEach((c) => { if (c.userData?.pc && c.geometry?.parameters?.width < 0.2) c.visible = false; });
    await D.wait(0.4);
    G.play('keyTurn', { onTurn: () => g.audio?.play?.('keyTurn', { volume: 0.6 }) });
    await D.wait(1.4);
    // green light spills from under the door, then the door swings open on light
    const glow = L.basement.userData.glow;
    await D.tween((k) => { glow.material.uniforms && glow.material.uniforms.uGlow && (glow.material.uniforms.uGlow.value = k * 2.2); }, 1.0);
    g.audio?.play?.('portalHum', { volume: 0.6 });
    D.shake(0.15);
    await D.flash(0xc8fff0, 0.9);
    P.setExpr('shocked'); D.emote(P, 'excl'); P.squash(0.3);
    await D.say(G, 'Come on. Hold onto your hood.', { expr: 'gentle' });
    G.walkTo(-3.85, -2.6, { nav: null });
    await D.walk(P, -3.6, -2.2, { free: true });
    await D.fadeOut(0.8, 0xe8fff8);
    L.remove(G);
  });
  // ---------------------------------------------------------------- the island
  L = await g.goTo('spirit', {}, { transition: null });
  G = new Character(CHARACTERS.genzo);
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    g.renderer.uniforms.fadeColor.value.setHex(0xe8fff8);
    L.add(G); G.setPos(-5.2, 3.95); G.faceNow(0.4);
    g.place(P, -5.75, 4.05, 0.3);
    P.setHood(true); P.setExpr('shocked', { react: false });
    // establishing: the whole island in its sea of clouds
    D.cam({ x: 0, y: -0.2, z: 1.5, wupp: 0.034, pitch: 26, yaw: 0, dur: 0 });
    g.audio?.music?.('spirit', { volume: 0.6 });
    await D.fadeIn(1.8);
    D.caption('The Spirit Realm', { dur: 3.5, kind: 'place' });
    await D.cam({ x: -2.6, y: 0.6, z: 2.6, wupp: 0.012, pitch: 28, dur: 4.0, ease: 'inOutSine' });
    P.play('lookAround');
    await D.wait(1.2);
    P.setHood(false); // the hood comes down for the first time
    g.audio?.play?.('cloth', { volume: 0.4 });
    P.setExpr('surprised');
    await D.say(P, '...Whoa.', { expr: 'surprised' });
    G.setExpr('happy');
    await D.say(G, 'Welcome home. This was my island — well, it still is. Your grandmother and I spent every evening here, once.', { expr: 'nostalgic' });
    await D.say(G, 'It\'s always afternoon here when it\'s night back home. The spirits make the Konyoki that go into our machines.', { expr: 'gentle' });
    P.setExpr('confused');
    await D.say(P, 'Spirits. Make the capsules.', { expr: 'confused' });
    await D.say(G, 'Make what\'s *inside* them. Little souls of happiness. You\'ll see. First—', { expr: 'smug' });
    // ---- the dusty house
    D.mark('house');
    D.cam({ x: 0.6, y: 0.9, z: 1.2, wupp: 0.0105, pitch: 26, dur: 2.6, ease: 'inOutSine' });
    G.walkTo(0.4, 1.3, { nav: L.nav });
    await D.walk(P, -0.4, 1.55, { nav: L.nav });
    G.faceYaw(Math.PI); P.faceYaw(Math.PI);
    await D.say(G, '...Ah. Forty years of dust. Well. Grab a broom.', { expr: 'awkward', act: 'scratchHead' });
    // a dust bunny tumbles out of the open shoji — and looks at them
    const h1 = new Hokori({ seed: 11, size: 1.1 });
    h1.setPos(0.6, 0.15); L.scene.add(h1.root);
    const hokori = [h1];
    const tick = setInterval(() => {}, 1000);
    const upd = (dt) => { for (const h of hokori) h.update(dt); };
    L.updaters.push(upd);
    h1.lookAt(P.root);
    // it bounces down off the engawa, right past their feet, and turns round
    await h1.hopTo(0.05, 1.0);
    await h1.hopTo(0.0, 2.35, { speed: 2.2 });
    P.faceTo(h1.x, h1.z); G.faceTo(h1.x, h1.z);
    h1.faceTo(P.x, P.z);
    await D.cam({ x: 0.0, y: 0.3, z: 2.2, wupp: 0.0045, pitch: 18, dur: 1.0, clip: 1.2 });
    await D.wait(0.5);
    h1.squash(0.6); h1.setHappy(1.2);
    g.audio?.play?.('squeak', { volume: 0.5, pitch: 1.4 });
    await D.say(h1, 'Pyu!', { kind: 'spirit', auto: 0.8, name: '' });
    P.setExpr('shocked'); P.squash(0.4); D.emote(P, 'excl');
    await D.cam({ x: 0.0, y: 0.75, z: 1.8, wupp: 0.0088, pitch: 22, dur: 0.8, clip: 1.8 });
    await D.say(P, 'IT BLINKED. THE DUST BLINKED.', { kind: 'shout', expr: 'shocked' });
    G.setExpr('laugh');
    await D.say(G, 'Ho ho ho! That\'s a Hokori. A dust spirit. Harmless — they love a tidy house more than anything.', { expr: 'laugh' });
    // more of them pour out
    for (let i = 0; i < 5; i++) {
      const h = new Hokori({ seed: 20 + i * 5, size: 0.75 + Math.random() * 0.45 });
      h.setPos(0.4 + (Math.random() - 0.5) * 1.2, 0.1); L.scene.add(h.root); hokori.push(h);
      h.lookAt(P.root);
      h.hopTo(-1.3 + i * 0.6 + (Math.random() - 0.5) * 0.2, 2.1 + Math.random() * 0.6);
      g.audio?.play?.('poof', { volume: 0.25, pitch: 1.2 + i * 0.1 });
      await D.wait(0.25);
    }
    await D.wait(0.9);
    for (const h of hokori) { h.setHappy(1.5); h.squash(0.5); }
    P.setExpr('awkward'); D.emote(P, 'sweat');
    await D.say(G, 'They remember me! And they\'ve taken a shine to you, look.', { expr: 'happy' });
    h1.hopTo(P.x + 0.25, P.z + 0.35).then(() => { h1.lookAt(P.root); h1.setHappy(2); });
    await D.wait(0.8);
    P.setExpr('shy');
    await D.think(P, '(...It\'s kind of cute.)', { auto: 1.6 });
    // ---- a roar of wind
    D.mark('tengu');
    g.audio?.play?.('windGust', { volume: 0.8 });
    D.shake(0.4);
    for (const h of hokori) { h.squash(0.8); h.lookAt({ x: 4, y: 6, z: 0 }); }
    P.setExpr('surprised'); G.setExpr('surprised');
    P.lookAt({ x: 4, y: 6, z: 0 }, 1); G.lookAt({ x: 4, y: 6, z: 0 }, 1);
    await D.cam({ x: 1.6, y: 2.0, z: 1.2, wupp: 0.0145, pitch: 18, dur: 1.2 });
    // Tarōbō rides in on his cloud
    const T = new Character(CHARACTERS.tarobo);
    L.add(T);
    const ride = cloudPuff(77, { r: 6 }); L.scene.add(ride);
    const start = { x: 8, y: 7, z: -5 }, end = { x: 1.9, y: 0.05, z: 0.75 };
    T.setPos(start.x, start.z, start.y + 0.5); T.faceNow(-1.2);
    T.setExpr('grumpy', { react: false });
    await D.tween((k) => {
      const e = 1 - (1 - k) ** 3;
      const x = start.x + (end.x - start.x) * e, y = start.y + (end.y - start.y) * e + Math.sin(k * Math.PI) * 1.2, z = start.z + (end.z - start.z) * e;
      ride.position.set(x, y - 0.45, z); T.setPos(x, z, y + 0.05);
    }, 2.6);
    g.audio?.play?.('whoosh', { volume: 0.6 });
    g.particles?.emit('dustBig', { x: end.x, y: 0.2, z: end.z, n: 8 });
    T.setPos(end.x, end.z, 0);
    D.tween((k) => { ride.position.y = -0.4 - k * 6; ride.position.x = end.x + k * 4; }, 2.0);
    T.faceTo(G.x, G.z);
    P.lookAt(null); G.lookAt(null);
    for (const h of hokori) h.lookAt(T.root);
    P.faceTo(T.x, T.z); G.faceTo(T.x, T.z);
    await D.cam({ x: (T.x + G.x) / 2, y: 1.0, z: 1.45, wupp: 0.0098, pitch: 18, dur: 1.0, clip: 2.2 });
    await D.shout(T, 'GENZŌ!! Forty years! FORTY YEARS without so much as a cup of tea!', { expr: 'furious', act: 'hipsHands', name: 'Tarōbō' });
    G.setExpr('awkward');
    await D.say(G, 'Tarōbō-sama. You\'re looking... well. Very red.', { expr: 'awkward', act: 'bow' });
    await D.say(T, 'Don\'t you flatter me! My clouds have sat on your island so long the koi forgot the sky!', { expr: 'angry', name: 'Tarōbō' });
    T.faceTo(P.x, P.z);
    T.setExpr('skeptical');
    await D.say(T, '...And what is THIS? A turtle child, with no hood and its mouth open.', { expr: 'skeptical', name: 'Tarōbō' });
    P.setExpr('shocked');
    await D.say(G, 'My grandson, Mamoru. He\'s going to help me open the shop again.', { expr: 'proud' });
    T.setExpr('greedy');
    await D.say(T, 'Hmph! Then the shop owes me. Happiness, Genzō. A good jar of it. Then I\'ll clear your skies.', { expr: 'greedy', name: 'Tarōbō' });
    // Grandpa holds out today's jar
    G.setExpr('happy');
    await D.say(G, 'As it happens — Mamoru caught some today. His very first.', { expr: 'happy' });
    G.play('give', { dur: 1.0 });
    g.audio?.play?.('sparkle', { volume: 0.5 });
    g.particles?.emit('sparkle', { x: G.x + 0.3, y: 1.0, z: G.z, n: 10 });
    await D.wait(0.8);
    T.setExpr('surprised');
    await D.wait(0.5);
    T.setExpr('smug');
    await D.say(T, '...Hm. Small. But real. Very well!', { expr: 'smug', name: 'Tarōbō' });
    // the fan: one great swing and the cloud banks roll away
    D.mark('reveal');
    await D.cam({ x: 0, y: 1.2, z: -2, wupp: 0.046, pitch: 16, dur: 1.6, ease: 'inOutSine' });
    T.faceYaw(Math.PI);
    T.play('fan', { dur: 1.2, onSwing: () => { g.audio?.play?.('windGust', { volume: 0.9 }); D.shake(0.5); } });
    await D.wait(0.6);
    for (const h of hokori) h.squash(0.9);
    await L.revealIslands(3.2);
    await D.wait(0.6);
    D.caption('Kappa Island · Tarōbō\'s Castle', { dur: 3.0, kind: 'place' });
    await D.wait(1.4);
    T.faceTo(P.x, P.z); P.faceTo(T.x, T.z);
    await D.cam({ x: (P.x + T.x) / 2, y: 0.95, z: 1.45, wupp: 0.0098, pitch: 18, dur: 1.2, clip: 2.2 });
    P.setExpr('surprised');
    await D.say(P, '...There are more islands.', { expr: 'surprised' });
    T.setExpr('smug');
    await D.say(T, 'Of course there are, child. Kappei\'s hot spring over there — and MY castle, the finest in the sky.', { expr: 'proud', act: 'point', name: 'Tarōbō' });
    await D.say(T, 'Bring me Happiness, and I\'ll clear more. And make a decent pot of tea, Genzō, for once in your life!', { expr: 'determined', name: 'Tarōbō' });
    G.setExpr('laugh');
    await D.say(G, 'Ho ho! Tomorrow, Tarōbō-sama. Tea tomorrow.', { expr: 'laugh' });
    await D.wait(0.6);
    // he leaps back onto his cloud and is gone
    g.audio?.play?.('whoosh', { volume: 0.7 });
    const back = cloudPuff(78, { r: 6 }); L.scene.add(back); back.position.set(T.x, -0.6, T.z);
    await D.tween((k) => { const y = k * 7, x = T.x + k * 8; back.position.set(x, y - 0.6, T.z - k * 4); T.setPos(x, T.z - k * 4 * 0.02, y); }, 2.0);
    L.remove(T); L.scene.remove(back); L.scene.remove(ride);
    // ---- the end of the evening
    D.mark('end');
    await D.cam({ x: (P.x + G.x) / 2, y: 0.9, z: (P.z + G.z) / 2 + 0.2, wupp: 0.0085, pitch: 20, dur: 1.0, clip: 1.8 });
    G.faceTo(P.x, P.z); P.faceTo(G.x, G.z);
    await D.say(G, 'Well! That went better than last time. He only threw me off the island twice, back then.', { expr: 'laugh' });
    P.setExpr('smile');
    D.emote(P, 'note');
    await D.wait(0.6);
    await D.say(P, '...Grandpa. This is insane.', { expr: 'smile' });
    G.setExpr('gentle');
    await D.say(G, 'It is, isn\'t it?', { expr: 'gentle' });
    clearInterval(tick);
    await D.cam({ x: 0, y: -0.2, z: 1.5, wupp: 0.034, pitch: 26, dur: 3.5, ease: 'inOutSine' });
    await D.fadeOut(2.0);
    L.updaters = L.updaters.filter((f) => f !== upd);
    for (const h of hokori) L.scene.remove(h.root);
    L.remove(G);
    await D.title('To be continued', 'Kodamaya · Day 2', 2.6);
  });
}
