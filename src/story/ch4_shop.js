// Chapter 4 — Kodamaya.
// Grandpa unlocks the padlock and heaves the shutter up with a long metal
// rattle and a cloud of dust. Inside it's dim and still: machines under
// sheets, cobwebs, a calendar stuck in 2019. The tubes stutter on. Grandpa
// pulls a sheet off one machine like a magician. Then Mamo finds the old
// photo on the wall — his dad, seven years old, in front of this same shop.
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { duffel } from '../world/props.js';

export async function shopChapter(g) {
  const D = g.director;
  const P = g.player;
  // ---------------------------------------------------------------- outside: the shutter
  let L = await g.goTo('ginza', { camX: 25 }, { transition: null });
  const K = L.shops.kodamaya;
  const kx = K.position.x;
  let G = new Character(CHARACTERS.genzo);
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.crowd.keepOut(kx, 1.8, 2.6);
    L.crowd.clearAround(kx, 1.8, 2.4, L.nav);
    L.add(G); G.setPos(kx + 0.15, 0.95); G.faceNow(Math.PI);
    g.place(P, kx - 0.9, 2.1, Math.PI - 0.4);
    P.setHood(true); P.setExpr('neutral', { react: false });
    P.hold(duffel(0x4c5b84), 'L');
    D.cam({ x: kx - 0.3, y: 1.15, z: 1.6, wupp: 0.0105, pitch: 18, yaw: 0, dur: 0, clip: 2.2 });
    await D.fadeIn(1.0);
    D.mark('unlock');
    // the padlock at the bottom of the shutter
    G.play('pickup', { dur: 0.9 });
    await D.wait(0.6);
    G.play('keyTurn', { onTurn: () => g.audio?.play?.('keyTurn', { volume: 0.6 }) });
    await D.wait(1.4);
    g.audio?.play?.('drop', { volume: 0.4, pitch: 1.4 });
    await D.say(G, 'Hup—!', { expr: 'determined', auto: 0.6 });
    // the shutter goes up with a long rattle
    G.play('rollShutter', { dur: 2.4 });
    g.audio?.play?.('shutterUp', { volume: 0.8 });
    D.shake(0.12);
    const sm = K.userData.shutter;
    await D.wait(0.6);
    await D.tween((k) => { sm.scale.y = 1 - k * 0.94; }, 1.6, (x) => x * x * (3 - 2 * x));
    g.particles?.emit('dustBig', { x: kx, y: 0.3, z: 0.4, n: 8 });
    g.particles?.emit('dustPuff', { x: kx - 0.8, y: 0.2, z: 0.5, n: 6 });
    g.particles?.emit('dustPuff', { x: kx + 0.8, y: 0.2, z: 0.5, n: 6 });
    P.play('flail');
    P.setExpr('disgust');
    D.emote(P, 'sweat');
    await D.wait(0.5);
    await D.say(P, '*cough* *cough*', { expr: 'disgust', auto: 0.9 });
    G.setExpr('laugh');
    await D.say(G, 'Ho ho! She\'s been resting a while.', { expr: 'laugh', act: 'scratchHead' });
    D.mark('enter');
    await D.fadeOut(0.7);
    L.remove(G);
    L.crowd.keepOut(null);
    P.drop('L');
  });
  // ---------------------------------------------------------------- inside: the dim shop
  L = await g.goTo('kodamaya', {}, { transition: null });
  L.setLights(false); L.setDust(1);
  G = new Character(CHARACTERS.genzo);
  await D.cutscene(async () => {
    L.add(G); G.setPos(0.6, 2.55); G.faceNow(Math.PI);
    g.place(P, -0.2, 2.75, Math.PI);
    P.setHood(true);
    P.hold(duffel(0x4c5b84), 'L');
    D.cam({ x: 0, y: 1.2, z: 0.6, wupp: 0.0135, pitch: 30, yaw: 0, dur: 0 });
    await D.fadeIn(1.2);
    g.audio?.music?.('kodamaya', { volume: 0.5 });
    await D.wait(0.6);
    P.play('lookAround');
    await D.think(P, '...It\'s so quiet.', { auto: 1.6 });
    G.walkTo(4.55, -1.85);
    await D.say(G, 'Hold on, hold on, the switch is over here somewhere...', { expr: 'neutral', auto: 1.4 });
    await D.wait(1.6);
    G.faceYaw(-Math.PI / 2);
    G.play('point', { dur: 0.5 });
    g.audio?.play?.('click', { volume: 0.5 });
    // the tubes stutter on, one by one
    D.mark('lights');
    const seq = [1, 0, 0, 1, 0, 1, 1, 0.4, 1];
    for (const v of seq) { L.onU.value = v; g.audio?.play?.('fluoTick', { volume: 0.25 }); await D.wait(0.09 + Math.random() * 0.12); }
    L.setLights(true);
    g.audio?.play?.('fluoHum', { volume: 0.2 });
    await D.cam({ x: -0.5, y: 1.25, z: -0.2, wupp: 0.0128, pitch: 30, dur: 2.4, ease: 'inOutSine' });
    P.setExpr('surprised');
    D.emote(P, 'dots');
    await D.think(P, 'Machines... everywhere. Under sheets.', { auto: 1.8 });
    // Grandpa whips a sheet off one machine
    D.mark('sheet');
    const target = L.machines.find((m) => m.sheet && m.z > -1) || L.machines.find((m) => m.sheet);
    G.walkTo(target.x + 0.15, target.z + 0.55).then(() => G.faceYaw(Math.PI));
    await D.walk(P, target.x - 0.7, target.z + 1.15, { nav: L.nav });
    P.faceTo(target.x, target.z);
    await D.wait(1.0);
    await D.cam({ x: target.x - 0.2, y: 0.85, z: target.z + 0.5, wupp: 0.0082, pitch: 22, dur: 1.2, clip: 1.6 });
    G.setExpr('excited');
    await D.say(G, 'Ta-daa!', { expr: 'excited', auto: 0.5 });
    G.play('give', { dur: 0.7 });
    await D.wait(0.35);
    target.sheet.visible = false; target.sheet.userData.off = true;
    g.audio?.play?.('whoosh', { volume: 0.5 });
    g.particles?.emit('dustBig', { x: target.x, y: 0.9, z: target.z + 0.2, n: 7 });
    await D.wait(0.6);
    G.setExpr('happy');
    await D.say(G, 'Still works, you know. Every one of them. Kids used to line up out the door for these.', { expr: 'happy' });
    P.setExpr('neutral');
    await D.say(G, 'Haven\'t had much reason to open, lately...', { expr: 'sad', auto: 1.6 });
    // ---- the photo
    D.mark('photo');
    P.walkTo(3.25, -0.05, { nav: L.nav });
    await D.wait(1.8);
    P.faceYaw(Math.PI);
    P.lookAt({ x: 3.25, y: 2.25, z: -3 }, 1);
    await D.cam({ x: 3.25, y: 2.25, z: -2.95, wupp: 0.0042, pitch: 10, dur: 1.8, ease: 'inOutSine', clip: 1.4 });
    await D.wait(1.0);
    await D.think(P, '...', { auto: 1.2 });
    G.walkTo(2.1, 0.5, { nav: L.nav });
    await D.say(G, 'That\'s your father. Seven years old, in front of this very shop.', { expr: 'gentle' });
    await D.cam({ x: 2.68, y: 0.9, z: 0.25, wupp: 0.0072, pitch: 18, dur: 1.4, clip: 1.4 });
    G.faceYaw(1.2);
    P.lookAt(null);
    P.setExpr('teary', { react: false });
    await D.say(G, 'He used to say he\'d run it himself one day. Sit right behind that counter.', { expr: 'nostalgic' });
    await D.wait(0.8);
    P.faceYaw(-1.0);
    await D.say(P, '...He never told me that.', { expr: 'sad' });
    await D.wait(1.0);
    G.setExpr('gentle');
    G.play('pat');
    await D.wait(1.4);
    // ---- upstairs
    D.mark('upstairs');
    G.setExpr('happy');
    await D.say(G, 'Right! Your room\'s up the stairs. It\'s, ah... a little full. I\'ll put the kettle on.', { expr: 'happy', act: 'point' });
    D.cam({ x: -3.6, y: 1.2, z: 0.4, wupp: 0.012, pitch: 28, dur: 2.2 });
    await D.walk(P, -3.85, 1.7, { nav: L.nav });
    P.faceYaw(Math.PI);
    await D.fadeOut(1.0);
    L.remove(G);
    P.drop('L');
  });
}
