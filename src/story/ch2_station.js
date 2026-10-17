// Chapter 2 — Kodama-machi station.
// The Kodama glides into platform 14 and the doors hiss open. Mamo steps off
// last, hood up, and the camera walks with him: along the crowded platform,
// down the stairs, through the concourse (the ekiben shop, the omiyage shop
// piled with mascot boxes, the departure board), through the ticket gates —
// and there, past the gates, a crayon sign bobbing over everyone's heads:
// "まもる!!" Grandpa. The hug. The bag that is "very light".
import * as THREE from 'three';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { duffel } from '../world/props.js';
import { PLAT } from '../locations/platform.js';
import { CON } from '../locations/concourse.js';

const ease = (t) => 1 - Math.pow(1 - t, 3);

export async function stationChapter(g) {
  const D = g.director;
  const later = (sec, fn) => D.wait(sec).then(fn);
  let L = await g.goTo('platform', { trainX: -70 }, { transition: null });
  const P = g.player;
  let C = L.crowd;
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    g.audio?.music?.('station');
    g.audio?.ambience?.('station');
    L.openDoors(0);
    // Mamo waits inside the train (hidden) by the door nearest the stairs
    const door = L.doorXs[L.doorXs.length - 1];
    g.place(P, door, -0.6, 0, 0);
    P.root.visible = false;
    P.setHood(true);
    P.setExpr('hollow', { react: false });
    P.stopAction();
    P.hold(duffel(0x4c5b84), 'R');
    // everyone in the queues turns to watch the train come in
    for (const p of C.people) if (p.mode === 'queue') { p.c.stopAction(); p.c.faceYaw(Math.PI + (Math.random() - 0.5) * 0.6); p.o.calm = true; }
    // ---- the train glides in
    D.cam({ x: -8, y: 1.5, z: -0.4, wupp: 0.012, pitch: 22, yaw: 0, dur: 0 });
    await D.fadeIn(1.6);
    D.caption('Kodama-machi Station · Platform 14', { dur: 3.5, kind: 'place' });
    g.audio?.play?.('trainChime', { volume: 0.6 });
    const ann = g.audio?.announce?.({ ja: 'まもなく、14番線に、こだま号、木霊町行きが、到着します。黄色い線の内側まで、お下がりください。', en: 'The Kodama is now arriving at platform 14. Please stand behind the yellow line.' });
    D.caption('“The Kodama is now arriving at platform 14.”', { dur: 4, kind: 'subtitle' });
    D.cam({ x: 4, y: 1.4, z: 0.2, wupp: 0.0125, pitch: 24, dur: 7.5, ease: 'inOutSine' });
    await D.tween((k) => L.setTrain(-70 * (1 - ease(k))), 7.5, (x) => x);
    g.audio?.play?.('trainBrake', { volume: 0.5 });
    D.shake(0.15);
    await Promise.race([ann, D.wait(1.5)]);
    // ---- doors open; the queues step aside to let people off
    for (const p of C.people) if (p.mode === 'queue') {
      const dx = L.doorXs.reduce((a, b) => (Math.abs(b - p.c.x) < Math.abs(a - p.c.x) ? b : a), L.doorXs[0]);
      const side = p.c.x < dx ? -1 : 1;
      p.c.walkTo(dx + side * (Math.abs(dx - door) < 0.1 ? 1.5 : 1.1), p.c.z + 0.1).then(() => p.c.faceTo(dx, 0));
    }
    g.audio?.play?.('trainDoor', { volume: 0.7 });
    await D.tween((k) => L.openDoors(k), 0.9);
    // ---- passengers pour out and stream to the stairs
    const roles = ['salaryman', 'tourist', 'officeLady', 'tourist', 'student', 'salaryman', 'granny', 'shopper', 'tourist', 'salaryman'];
    roles.forEach((role, i) => {
      const others = L.doorXs.filter((x) => Math.abs(x - door) > 0.1);
      const dx = i < 7 ? others[i % others.length] : door;
      later(i * 0.38, () => {
        const p = C.add({ seed: 900 + i * 13, role }, { x: dx, z: -0.5, yaw: 0, mode: 'still' });
        const toZ = 1.0 + Math.random() * 0.4;
        p.c.walkTo(dx + (Math.random() - 0.5) * 0.4, toZ).then(() => p.c.walkTo(PLAT.stairsX - 2.6, 4.0 + Math.random() * 0.8, { nav: L.nav, run: role === 'salaryman' && i % 3 === 0 })).then(() => p.c.walkTo(PLAT.stairsX + 1.5, 4.0)).then(() => C.remove(p));
      });
    });
    D.cam({ x: 8, y: 1.0, z: 2.6, wupp: 0.0115, pitch: 34, dur: 3 });
    await D.wait(3.6);
    // ---- Mamo steps off last, and from here the camera walks with him
    D.mark('mamo');
    P.root.visible = true;
    P.setPos(door, -0.5);
    P.faceNow(0);
    C.clearAround(door, 1.4, 1.8, L.nav);
    await D.cam({ x: door, y: 0.8, z: 1.2, wupp: 0.0068, pitch: 18, dur: 1.4, clip: 1.4 });
    await D.walk(P, door, 1.1, { free: true });
    P.play('lookAround');
    await D.wait(1.4);
    await D.think(P, '...So many people.', { auto: 1.6 });
    // the queues board behind him
    C.people.filter((p) => p.mode === 'queue').forEach((p, i) => {
      later(1.6 + i * 0.26, () => {
        const dx = L.doorXs.reduce((a, b) => (Math.abs(b - p.c.x) < Math.abs(a - p.c.x) ? b : a), L.doorXs[0]);
        p.mode = 'still'; p.c.stopAction();
        p.c.walkTo(dx + (Math.random() - 0.5) * 0.3, 0.6).then(() => p.c.walkTo(dx, -0.7)).then(() => C.remove(p));
      });
    });
    // a side-on tracking shot along the platform: columns, benches, people slide past
    D.mark('walk1');
    g.rig.clip = 0;
    D.follow(P, { wupp: 0.0082, pitch: 17 });
    g.rig.followOffset.set(0.6, 0.85, 1.8);
    const walkTo = D.walk(P, PLAT.stairsX - 6.5, 3.9, { nav: L.nav });
    // a salaryman in a hurry clips his shoulder on the way
    later(2.2, () => {
      const rush = C.add({ seed: 77, role: 'salaryman' }, { x: P.x - 2.5, z: P.z + 0.3, yaw: 1.57, mode: 'still' });
      rush.c.walkTo(P.x + 5, P.z + 0.1, { run: true }).then(() => rush.c.walkTo(PLAT.stairsX - 2, 4.2)).then(() => C.remove(rush));
      later(0.9, () => { g.audio?.play?.('boxDrop', { volume: 0.4 }); P.squash(0.25); D.emote(P, 'sweat'); D.shake(0.1); D.say(rush.c, 'Sorry, sorry—!', { ambient: true, auto: 1.2, name: '' }); });
    });
    await walkTo;
    await D.walk(P, PLAT.stairsX - 2.0, PLAT.cz + 1.65, { nav: L.nav });
    // down the stairs
    const sx0 = PLAT.stairsX - 1.9;
    const stairsY = () => { P.y = -Math.max(0, P.x - sx0) * 0.5; };
    const tick = setInterval(stairsY, 16);
    D.fadeOut(1.6);
    await D.walk(P, PLAT.stairsX + 2.4, PLAT.cz + 1.65, { free: true });
    clearInterval(tick);
    P.y = 0;
    // ---- the concourse
    D.mark('concourse');
    L = await g.goTo('concourse', {}, { transition: null });
    C = L.crowd;
    const topX = CON.stairX - 4.6, topY = 3.2;
    g.place(P, topX, -2.2, Math.PI / 2, 0);
    P.y = topY;
    // Grandpa past the gates, sign up high over the crowd
    const G = new Character(CHARACTERS.genzo);
    L.add(G);
    G.setPos(13.4, 0.9); G.faceNow(-Math.PI / 2 + 0.3);
    G.hold(L.signMesh, 'head');
    L.signMesh.position.set(0, 0.95, 0.12);
    L.signMesh.rotation.set(-0.15, 0, 0);
    G.play('holdUp', { loop: true, wave: true });
    G.setExpr('excited', { react: false });
    C.clearAround(12.8, 0.9, 2.2, L.nav);
    C.keepOut(12.6, 0.9, 2.4);
    D.cam({ x: CON.stairX - 1.6, y: 1.9, z: 0.8, wupp: 0.0098, pitch: 15, yaw: 0, dur: 0, clip: 0 });
    D.fadeIn(1.2);
    const down = (x) => Math.max(0, Math.min(topY, (CON.stairX - x) * (topY / 4.8)));
    const tick2 = setInterval(() => { P.y = down(P.x); }, 16);
    await D.walk(P, CON.stairX + 0.4, -2.2, { free: true });
    clearInterval(tick2);
    P.y = 0;
    D.caption('Kodama-machi Station', { dur: 3, kind: 'place' });
    // walk along the shops with the camera alongside
    D.follow(P, { wupp: 0.0095, pitch: 15 });
    g.rig.followOffset.set(1.2, 1.15, 2.6);
    await D.walk(P, -9.6, -1.3, { nav: L.nav });
    // the smell of the ekiben shop...
    P.lookAt({ x: -9.6, y: 1.0, z: CON.zBack + 1.3 }, 0.8);
    await D.wait(0.6);
    await D.walk(P, -4.2, -1.1, { nav: L.nav });
    P.lookAt({ x: -2.4, y: 0.7, z: CON.zBack + 2.0 }, 0.8); // the tanuki standee grins at him
    await D.think(P, '...a tanuki?', { auto: 1.2 });
    P.lookAt(null);
    D.mark('gates');
    await D.walk(P, CON.gateX - 1.3, -0.15, { nav: L.nav });
    // through the gate: tap, beep, the flaps fly open
    P.faceNow(Math.PI / 2);
    P.play('checkPhone');
    const gate = L.passGate(2);
    await D.wait(0.35);
    await D.walk(P, CON.gateX + 1.4, -0.15, { free: true });
    await gate;
    // ---- MAMORU!
    D.mark('sign');
    G.play('holdUp', { loop: true, wave: true, hop: true });
    await D.cam({ x: G.x - 0.4, y: 1.15, z: G.z + 0.6, wupp: 0.0064, pitch: 14, yaw: -12, dur: 1.4, clip: 1.4 });
    g.audio?.voice?.(CHARACTERS.genzo.voice, 'MAMORU!', { pitch: 1.1 });
    await D.shout(G, 'MAMORU! MAMORUUU! Over here!!', { expr: 'joy' });
    await D.cam({ x: P.x + 0.3, y: 0.9, z: P.z + 1.0, wupp: 0.0062, pitch: 14, yaw: 10, dur: 1.0, clip: 1.4 });
    P.lookAt(G.root, 1);
    P.setExpr('surprised');
    D.emote(P, 'excl');
    await D.wait(0.9);
    P.setExpr('awkward');
    await D.think(P, 'Grandpa...?', { auto: 1.4 });
    // ---- the walk over
    D.mark('walk');
    const MX = G.x - 0.45, MZ = G.z;
    D.cam({ x: (P.x + MX) / 2, y: 1.0, z: 2.6, wupp: 0.0085, pitch: 18, yaw: 0, dur: 2.6, clip: 0 });
    G.stopAction();
    const sign = G.drop('head');
    L.scene.add(sign); sign.position.set(G.x + 0.6, 0.32, G.z - 0.6); sign.rotation.set(-0.35, -0.2, 0.06);
    G.setExpr('joy');
    G.walkTo(MX + 0.45, MZ).then(() => G.faceYaw(-0.7));
    await D.walk(P, MX - 0.5, MZ, { nav: L.nav });
    P.lookAt(null);
    P.faceYaw(0.7); G.faceYaw(-0.7);
    await D.cam({ x: MX, y: 0.7, z: MZ, wupp: 0.0066, pitch: 17, yaw: 0, dur: 1.4, clip: 1.5 });
    D.mark('reunion');
    await D.say(G, 'Look at you! You got so tall!', { expr: 'joy', act: 'clap' });
    P.setExpr('shy');
    P.play('handsBack', { loop: true });
    await D.say(P, '...Hi, Grandpa.', { expr: 'shy' });
    await D.wait(0.6);
    G.setExpr('gentle');
    G.play('holdOut', { loop: true });
    await D.wait(1.0);
    D.emote(P, 'dots');
    await D.wait(1.3);
    // the hug
    g.audio?.music?.('kodamaya');
    await D.say(G, 'Come here, you.', { expr: 'gentle' });
    P.stopAction();
    await D.walk(P, G.x - 0.56, G.z, { free: true });
    // bodies cheated toward the camera, heads turned out so both faces read
    P.faceYaw(Math.PI / 2 - 0.35); G.faceYaw(-Math.PI / 2 + 0.35);
    G.play('hug', { loop: true, squeeze: true, headYaw: 0.55, tilt: 0.1 });
    P.play('beHugged', { loop: true, back: 0, headYaw: -0.75 });
    g.audio?.play?.('hug', { volume: 0.5 });
    P.setExpr('surprised', { react: false });
    D.mark('hug');
    await D.cam({ x: (P.x + G.x) / 2, y: 0.8, z: G.z, wupp: 0.0048, pitch: 16, yaw: 0, dur: 2.2, ease: 'inOutSine', clip: 1.3 });
    await D.say(G, "You did good, coming all this way by yourself.", { expr: 'gentle' });
    P.setExpr('teary');
    await D.say(G, '...Your father rode this same train, you know. Every summer, when he was your age.', { expr: 'nostalgic' });
    // Mamo slowly hugs back
    await D.tween((k) => { if (P.action) P.action.opts.back = k; }, 2.2);
    P.setExpr('crying', { react: false });
    await D.wait(1.6);
    P.setExpr('gentle');
    await D.wait(1.0);
    G.stopAction();
    P.stopAction();
    G.play('pat');
    await D.wait(1.6);
    P.walkTo(G.x - 0.8, G.z).then(() => P.faceYaw(0.7));
    await D.wait(0.5);
    G.faceYaw(-0.7);
    // ---- the bag that is "very light"
    D.mark('bag');
    await D.cam({ x: G.x - 0.4, y: 0.72, z: G.z, wupp: 0.0066, pitch: 21, yaw: 0, dur: 1.2, clip: 1.5 });
    await D.say(G, 'Now! Give that bag to your grandpa. Still strong as an ox, this one!', { expr: 'determined', act: 'hipsHands' });
    P.play('give', { dur: 0.9 });
    await D.wait(0.5);
    const b2 = P.drop('R');
    G.hold(b2, 'both');
    G.play('strain', { loop: true });
    G.setExpr('shocked');
    g.audio?.play?.('boxLift', { volume: 0.5 });
    D.shake(0.1);
    D.emote(G, 'sweat');
    await D.wait(0.8);
    await D.say(G, "Hnnngh... my, it's... very... light...", { expr: 'determined', auto: 1.8 });
    g.audio?.play?.('crankTick', { volume: 0.6, pitch: 0.5 });
    D.emote(G, 'excl');
    G.setExpr('shocked');
    await D.wait(0.6);
    P.setExpr('surprised');
    await D.wait(0.5);
    G.stopAction();
    const b3 = G.drop('both');
    P.hold(b3, 'R');
    P.setExpr('smile');
    await D.say(P, "I've got it, Grandpa.", { expr: 'smile' });
    G.setExpr('laugh');
    G.play('scratchHead');
    await D.say(G, 'Ho ho! Strong like your father.', { expr: 'laugh' });
    await D.say(G, "Come, come. Kodamaya's just down Kodama Ginza. We'll be home before the lamps come on.", { expr: 'happy', act: 'point', actOpts: {} });
    // ---- out through the glass doors into the evening
    C.keepOut(null);
    D.cam({ x: CON.doorX - 3, y: 1.1, z: 1.6, wupp: 0.0105, pitch: 16, dur: 3.5, clip: 0 });
    G.walkTo(CON.doorX + 0.6, 0.4);
    await D.wait(0.5);
    await D.walk(P, CON.doorX - 1.2, 0.9, { nav: L.nav });
    P.walkTo(CON.doorX + 0.6, 0.9);
    await D.wait(0.9);
    await D.fadeOut(1.2);
    L.remove(G);
  });
}
