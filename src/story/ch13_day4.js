// Chapter 13 — Day 4: Kappa Island.
// The maneki-neko runs the morning (she beckons kids in from the street) so
// Grandpa can tell Mamo: Kappei has invited him to the island tonight. "You
// can't swim? A turtle who can't swim!" At the lagoon Kappei dives off the
// pier; Mamo climbs down the ladder, sure he'll sink... and floats. Tap the
// buoys to swim the course with Kappei paddling alongside. At the last buoy,
// for the first time, Happiness bursts out of Mamo himself. Kappei tells him
// his dad learned to swim right here, scared just the same. Then the hot
// spring: Grandpa, Kappei, Mamo — and Tarōbō, who drops in with a splash.
import * as THREE from 'three';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { starMesh } from '../game/shopDay.js';
import { cloudPuff } from '../world/spiritIsland.js';
import { LAGOON } from '../locations/kappa.js';

const ISO = { yaw: 45, pitch: 44 };
const SWIM_Y = -0.48;

export async function day4Chapter(g) {
  const D = g.director;
  const P = g.player;
  const until = (fn) => new Promise((res) => { const t = setInterval(() => { if (fn()) { clearInterval(t); res(); } }, 150); });
  // ---------------------------------------------------------------- morning at the shop
  let L = await g.goTo('kodamaya', {}, { transition: null });
  L.setDay(10.5);
  if (L.maneki) L.maneki.userData.awake = true;
  let G = new Character(CHARACTERS.genzo);
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.add(G); G.setPos(3.05, -1.55); G.faceNow(0.2);
    g.place(P, 2.1, -0.15, 0.6);
    P.setHood(false); P.setExpr('neutral', { react: false });
    D.cam({ x: 2.9, y: 1.0, z: -0.8, wupp: 0.0072, pitch: 22, dur: 0, clip: 1.6 });
    await D.fadeIn(1.0);
    g.audio?.music?.('shopDay', { volume: 0.5 });
    await D.cam({ x: L.maneki.position.x, y: 1.15, z: L.maneki.position.z + 0.2, wupp: 0.0045, pitch: 18, dur: 1.0, clip: 1.2 });
    await D.say(L.maneki, 'Nya~ nya~', { kind: 'spirit', auto: 1.0, name: '' });
    await D.cam({ x: 2.6, y: 1.0, z: -0.7, wupp: 0.0075, pitch: 22, dur: 0.8, clip: 1.6 });
    await D.say(G, 'Ho ho! She\'s been beckoning kids in from the street all morning. She\'s better at this than me!', { expr: 'laugh' });
    await D.say(G, 'Oh — Kappei came by the basement door at dawn. You\'re invited to his island tonight.', { expr: 'happy' });
    P.setExpr('awkward');
    await D.say(P, '...He wants to teach me to swim. I can\'t, you know.', { expr: 'awkward' });
    G.setExpr('gentle');
    await D.say(G, 'Hm. Your father couldn\'t either, at your age. Go on. It\'ll be fun.', { expr: 'gentle' });
    P.setExpr('surprised');
    await D.wait(0.6);
    await D.fadeOut(1.0);
    D.caption('That evening...', { dur: 2.0, kind: 'place' });
    await D.wait(1.6);
    L.remove(G);
  });
  // ---------------------------------------------------------------- Kappa Island
  L = await g.goTo('kappa', {}, { transition: null });
  const K = new Character(CHARACTERS.kappei);
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    // Mamo arrives on a little cloud
    const ride = cloudPuff(55, { r: 5 }); L.scene.add(ride);
    g.place(P, -5.6, 0.6, 0.9, 1.5);
    ride.position.set(-5.6, 1.0, 0.6);
    L.add(K); K.setPos(-3.3, 0.9); K.faceNow(-1.6);
    K.setExpr('joy', { react: false });
    D.cam({ x: 0, y: -0.4, z: 0.8, wupp: 0.028, pitch: ISO.pitch, yaw: ISO.yaw, dur: 0 });
    g.audio?.music?.('spirit', { volume: 0.55 });
    await D.fadeIn(1.6);
    D.caption('Kappa Island', { dur: 3, kind: 'place' });
    await D.tween((k) => { const y = 1.5 * (1 - k); ride.position.set(-5.6 + k * 1.2, y - 0.5, 0.6 + k * 0.3); P.setPos(-5.6 + k * 1.2, 0.6 + k * 0.3, y); }, 2.0);
    P.setPos(-4.4, 0.9, 0);
    D.tween((k) => { ride.position.y = -0.5 - k * 6; }, 1.6).then(() => L.scene.remove(ride));
    await D.cam({ x: -3.8, y: 0.6, z: 0.9, wupp: 0.0095, pitch: 36, yaw: ISO.yaw, dur: 1.4, clip: 2.0 });
    K.play('wave');
    await D.say(K, 'Mamoru! You came! Welcome to the best island in the sky!', { expr: 'joy', name: 'Kappei' });
    P.setExpr('shy');
    await D.say(P, '...It\'s really nice.', { expr: 'shy' });
    await D.say(K, 'Cucumbers over there, my hot spring over there, and the lagoon! Come on!', { expr: 'excited', act: 'point' });
    // ---- the pier
    D.mark('pier');
    const pe = L.pierEnd;
    K.walkTo(pe.x + 0.3, pe.z - 0.3, { nav: L.nav, run: true });
    await D.walk(P, pe.x - 0.15, pe.z - 0.55, { nav: L.nav });
    await D.wait(0.8);
    K.faceTo(LAGOON.x, LAGOON.z + 1); P.faceTo(LAGOON.x, LAGOON.z + 1);
    await D.cam({ x: pe.x + 0.3, y: 0.5, z: pe.z, wupp: 0.0085, pitch: 36, yaw: ISO.yaw, dur: 1.0, clip: 2.0 });
    await D.say(K, 'Watch this!', { expr: 'determined' });
    K.play('jump');
    g.audio?.play?.('boing', { volume: 0.5 });
    await D.tween((k) => K.setPos(pe.x + 0.3 + k * 0.5, pe.z - 0.3 + k * 0.9, Math.sin(k * Math.PI) * 0.7 + SWIM_Y * k * k), 0.8);
    g.audio?.play?.('splash', { volume: 0.7 });
    g.particles?.emit('dustPuff', { x: K.x, y: -0.05, z: K.z, n: 8 });
    K.play('tread', { loop: true });
    K.faceTo(P.x, P.z);
    await D.say(K, 'Ahh, perfect! Come on in!', { expr: 'joy', name: 'Kappei' });
    P.setExpr('scared');
    await D.say(P, 'I\'ll sink. I always sink.', { expr: 'scared' });
    await D.say(K, 'You\'re a TURTLE! Turtles float! It\'s practically your whole thing!', { expr: 'laugh', act: 'point', name: 'Kappei' });
    P.setExpr('awkward');
    await D.wait(0.5);
    // down the ladder, slowly
    P.play('pickup', { dur: 1.0 });
    await D.wait(0.6);
    g.audio?.play?.('splash', { volume: 0.4, pitch: 1.3 });
    await D.tween((k) => P.setPos(pe.x, pe.z + 0.35 * k, SWIM_Y * k), 1.0);
    P.play('tread', { loop: true });
    P.setExpr('shocked');
    await D.wait(0.6);
    P.setExpr('surprised');
    D.emote(P, 'excl');
    await D.say(P, '...I\'m floating.', { expr: 'surprised' });
    K.setExpr('excited');
    await D.say(K, 'SEE?! Now — swim to the buoys! Tap them, one after another. I\'ll race you!', { expr: 'excited', name: 'Kappei' });
    L.useNav('swim');
    D.follow(P);
  });
  // ---------------------------------------------------------------- the swimming lesson
  D.mark('swim');
  L.navs.swim = L.swimNav;
  L.useNav('swim');
  let next = 0;
  const center = new THREE.Vector3(LAGOON.x, 0, LAGOON.z);
  const marker = starMesh(0xfff0a0); marker.scale.setScalar(1.6); L.scene.add(marker);
  const placeMarker = () => { const b = L.buoys[next]; if (b) marker.position.set(b.x, 0.32, b.z); marker.visible = !!b; };
  L.updaters.push((dt, t) => { marker.rotation.y += dt * 3; marker.position.y = 0.3 + Math.sin(t * 4) * 0.04; });
  placeMarker();
  const cheers = ['Good! Kick, kick!', 'You\'re a natural!', 'Halfway! Keep going!', 'Faster, faster!', 'Last one! Go go go!'];
  const swimTo = (c, x, z) => { c.play('swim', { loop: true }); return c.walkTo(x, z, { nav: null }).then(() => { c.play('tread', { loop: true }); }); };
  for (let i = 0; i < L.buoys.length; i++) {
    const b = L.buoys[i];
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    b.mesh.add(hit);
    L.addInteract({ id: 'buoy' + i, obj: b.mesh, label: 'Buoy', enabled: () => next === i && !g.busyUse, free: true,
      use: () => { const s = new THREE.Vector3(b.x, 0, b.z).lerp(center, 0.25); return { x: s.x, z: s.z }; },
      onUse: async () => {
        if (next !== i) return;
        // Kappei paddles alongside (a little ahead, a little to the side)
        const s = new THREE.Vector3(b.x, 0, b.z).lerp(center, 0.4);
        swimTo(K, s.x + 0.25, s.z + 0.2);
        g.audio?.play?.('ding', { volume: 0.5, pitch: 1 + i * 0.1 });
        b.mesh.scale.setScalar(1.25); setTimeout(() => b.mesh.scale.setScalar(1), 200);
        g.particles?.emit('sparkle', { x: b.x, y: 0.2, z: b.z, n: 6 });
        next++;
        placeMarker();
        if (i === 2) P.setExpr('smile');
        if (i < cheers.length) g.bubbles.say(K, cheers[i], { auto: 1.2, ambient: true });
      },
    });
  }
  // walking (tapping the water) swims too
  const swimAnim = setInterval(() => { if (P.moving && P.action?.name !== 'swim') P.play('swim', { loop: true }); else if (!P.moving && P.action?.name === 'swim') P.play('tread', { loop: true }); }, 120);
  if (g.autoPlay) (async () => { while (next < L.buoys.length) { const it = L.getInteract('buoy' + next); if (it && !g.busyUse) await g.useInteractable(it); await D.wait(0.3); } })();
  await until(() => next >= L.buoys.length && !g.busyUse);
  clearInterval(swimAnim);
  for (let i = 0; i < L.buoys.length; i++) L.removeInteract('buoy' + i);
  L.scene.remove(marker);
  // ---------------------------------------------------------------- Mamo's own Happiness
  D.mark('happy');
  await D.cutscene(async () => {
    P.play('tread', { loop: true });
    // side by side along the screen (the iso camera's right vector is (+x, -z))
    K.play('swim', { loop: true });
    K.walkTo(P.x + 0.42, P.z - 0.42, { nav: null }).then(() => { K.play('tread', { loop: true }); K.faceYaw(-Math.PI / 4 + 0.5 + Math.PI); });
    await D.cam({ x: P.x + 0.2, y: 0.3, z: P.z - 0.2, wupp: 0.0068, pitch: 34, yaw: ISO.yaw, dur: 1.0, clip: 1.8 });
    await D.wait(1.2);
    P.faceYaw(Math.PI / 4 + 0.6); K.faceYaw(Math.PI / 4 - 0.6);
    P.setExpr('joy');
    await D.say(P, 'I did it. I actually swam!', { expr: 'joy' });
    K.setExpr('laugh');
    await D.say(K, 'HA! The whole course! Not bad for a turtle who "always sinks"!', { expr: 'laugh', act: 'cheer', name: 'Kappei' });
    // stars pour out of Mamo and float up into the gold sky
    g.audio?.play?.('sparkle', { volume: 0.6 });
    const stars = [];
    for (let i = 0; i < 9; i++) { const s = starMesh([0xff8ab8, 0xffe060, 0x8ae0ff, 0xb0f080, 0xd0a8ff][i % 5]); L.scene.add(s); stars.push({ s, a: (i / 9) * Math.PI * 2, sp: 0.8 + Math.random() * 0.6 }); }
    P.squash(0.4);
    await D.tween((k) => { for (const st of stars) { const r = 0.2 + k * 0.7; st.s.position.set(P.x + Math.cos(st.a + k * 3) * r, 0.5 + k * 2.4 * st.sp, P.z + Math.sin(st.a + k * 3) * r * 0.7); st.s.rotation.y = k * 8; } }, 3.0, (x) => x);
    for (const st of stars) L.scene.remove(st.s);
    P.setExpr('surprised');
    await D.say(P, '...Those were mine. That was MY Happiness.', { expr: 'surprised' });
    K.setExpr('gentle');
    await D.say(K, 'Yep. First time I\'ve seen you make any.', { expr: 'gentle', name: 'Kappei' });
    // ---- Dad
    D.mark('dad');
    await D.wait(0.8);
    await D.say(K, '...You know, your dad learned to swim right here. Same buoys. He was so scared he held onto my shell the whole first lap.', { expr: 'nostalgic', name: 'Kappei' });
    P.setExpr('sad');
    await D.wait(1.0);
    await D.say(P, '...He never told me any of this. Not the island. Not you. Nothing.', { expr: 'sad' });
    await D.say(K, 'Maybe he was saving it. For when you came here yourself.', { expr: 'gentle', name: 'Kappei' });
    P.setExpr('teary');
    await D.wait(1.4);
    P.setExpr('gentle');
    await D.think(P, '(...I think I get it, a little.)', { auto: 1.6 });
    K.setExpr('joy');
    await D.say(K, 'Right! Hot spring time! Last one in is a soggy pickle!', { expr: 'joy', act: 'point', name: 'Kappei' });
    await D.fadeOut(0.8);
  });
  // ---------------------------------------------------------------- the hot spring
  D.mark('onsen');
  L.useNav('island');
  G = new Character(CHARACTERS.genzo);
  const T = new Character(CHARACTERS.tarobo);
  const O = L.onsen;
  await D.cutscene(async () => {
    L.add(G);
    // everyone on the far half of the pool (from the iso camera), facing out toward it
    // a row along the far rim as the iso camera sees it (angles chosen so their
    // screen-x spreads evenly and nobody stands in front of anyone), facing the camera
    const SEAT = { P: 2.83, G: 3.55, T: 4.3, K: 5.03 };
    const soak = (c, a) => { c.stopAction(); c.setPos(O.x + Math.cos(a) * O.r * 0.62, O.z + Math.sin(a) * O.r * 0.62); c.faceNow(Math.PI / 4); c.setPose('sit'); c.y = -0.32; c.idleT = 999; c.play('tread', { loop: true }); };
    soak(P, SEAT.P); soak(G, SEAT.G); soak(K, SEAT.K);
    G.setExpr('calm', { react: false }); P.setExpr('calm', { react: false }); K.setExpr('happy', { react: false });
    D.cam({ x: O.x - 0.3, y: 0.45, z: O.z - 0.3, wupp: 0.0088, pitch: 34, yaw: ISO.yaw, dur: 0, clip: 2.4 });
    await D.fadeIn(1.0);
    g.audio?.play?.('sigh', { volume: 0.4 });
    await D.say(G, 'Ahhhh... Kappei, your spring is still the finest in the sky.', { expr: 'calm' });
    await D.say(K, 'Of course! Cucumber-infused!', { expr: 'proud', name: 'Kappei' });
    P.setExpr('confused');
    await D.say(P, '...It smells like salad.', { expr: 'confused' });
    G.setExpr('laugh');
    await D.say(G, 'Ho ho ho!', { expr: 'laugh', auto: 0.8 });
    // a shadow, a whistle of wind, and a huge splash
    D.mark('splash');
    g.audio?.play?.('windGust', { volume: 0.7 });
    for (const c of [P, K, G]) c.lookAt({ x: O.x, y: 4, z: O.z }, 1);
    await D.wait(0.8);
    L.add(T); T.setExpr('grumpy', { react: false });
    await D.tween((k) => T.setPos(O.x + 0.05, O.z + 0.05, 5 * (1 - k) * (1 - k) - 0.3 * k), 0.7);
    g.audio?.play?.('splash', { volume: 0.9 });
    D.shake(0.4);
    g.particles?.emit('dustBig', { x: O.x, y: 0.1, z: O.z, n: 10 });
    for (let i = 0; i < 6; i++) g.particles?.emit('steam', { x: O.x + (Math.random() - 0.5), y: 0.2, z: O.z + (Math.random() - 0.5), n: 2 });
    for (const c of [P, K, G]) { c.lookAt(null); c.setExpr('shocked'); c.squash(0.4); }
    T.setPose('sit'); T.setPos(O.x + Math.cos(SEAT.T) * O.r * 0.62, O.z + Math.sin(SEAT.T) * O.r * 0.62, -0.32); T.faceNow(Math.PI / 4); T.play('tread', { loop: true });
    await D.wait(0.8);
    await D.say(T, '...Hmph. Is this seat taken.', { expr: 'grumpy', name: 'Tarōbō' });
    K.setExpr('angry');
    await D.say(K, 'BIG NOSE! You splashed out half my spring!', { expr: 'furious', name: 'Kappei' });
    await D.say(T, 'Then it will refill. Like my patience, which is very low.', { expr: 'smug', name: 'Tarōbō' });
    G.setExpr('laugh');
    await D.say(G, 'Ho ho! Welcome, Tarōbō-sama. The boy swam the whole course today.', { expr: 'laugh' });
    T.lookAt(P.root, 1);
    T.setExpr('skeptical');
    await D.wait(0.8);
    T.setExpr('smug');
    await D.say(T, '...The whole course. Hmph. That is acceptable.', { expr: 'smug', name: 'Tarōbō' });
    K.setExpr('laugh');
    await D.say(K, 'That\'s Tengu for "amazing"!', { expr: 'laugh', name: 'Kappei' });
    T.setExpr('furious'); D.emote(T, 'anger');
    P.setExpr('smile'); D.emote(P, 'note');
    await D.wait(0.8);
    // plans: the next Konyoki
    D.mark('plans');
    T.lookAt(null);
    await D.say(K, 'Hey, Genzō-jii! Next batch — Kyūri Squishies! Soft little cucumbers you can squeeze!', { expr: 'excited', name: 'Kappei' });
    await D.say(T, 'And when that jar of yours is three-quarters full... I shall make Tengu Treasures. Fans. Crows. Magnificence.', { expr: 'proud', name: 'Tarōbō' });
    P.setExpr('determined');
    await D.say(P, '...Then I\'ll fill it. I want the shop to be really busy. Like it used to be.', { expr: 'determined' });
    G.setExpr('teary');
    await D.wait(0.6);
    G.setExpr('gentle');
    await D.say(G, '...Listen to him. Just like his father.', { expr: 'gentle' });
    g.state.goals = { ...(g.state.goals || {}), tenguTreasures: 0.75 };
    g.state.konyokiNext = ['kyuriSquishies'];
    await D.cam({ x: 0, y: -0.4, z: 0.8, wupp: 0.028, pitch: ISO.pitch, yaw: ISO.yaw, dur: 4.0, ease: 'inOutSine', clip: 0 });
    await D.fadeOut(2.0);
    for (const c of [G, T, K]) L.remove(c);
    P.stopAction(); P.setPose('stand'); P.y = 0;
    await D.title('Day 5', 'Kyūri Squishies are coming', 2.4);
  });
}
