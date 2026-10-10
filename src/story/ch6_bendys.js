// Chapter 6 — dinner at Bendy's.
// Bendo booms a welcome from the kitchen; Grandpa and his old friend fall
// straight into forty years of stories across the counter while Mamo sits
// with his phone, outside of it all. Then Yuki brings the omurice, asks what
// she should draw, and draws him — a little ketchup turtle. "It's you!"
// For a second, Mamo almost smiles.
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { phoneMesh } from '../entities/parts.js';
import { omurice } from '../locations/bendys.js';
import { VoxelModel, vm, fill, V25 } from '../world/build.js';

export async function bendysChapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('bendys', {}, { transition: null });
  const G = new Character(CHARACTERS.genzo);
  const B = new Character(CHARACTERS.bendo);
  const Y = new Character(CHARACTERS.yuki);
    await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    L.add(B); B.setPos(2.6, -1.75); B.faceNow(Math.PI - 0.2);
    B.play('cook', { loop: true });
    L.add(Y); Y.setPos(-0.4, 0.2); Y.faceNow(0.4);
    L.add(G); G.setPos(-0.2, 2.6); G.faceNow(Math.PI);
    g.place(P, -0.9, 2.75, Math.PI);
    P.setHood(true); P.setExpr('neutral', { react: false });
    D.cam({ x: 0.3, y: 1.0, z: 0.6, wupp: 0.0128, pitch: 32, dur: 0 });
    await D.fadeIn(1.0);
    g.audio?.music?.('bendys', { volume: 0.5 });
    g.audio?.play?.('doorBell', { volume: 0.6 });
    // ---- welcome
    Y.faceTo(G.x, G.z);
    Y.play('bow');
    await D.say(Y, 'Irasshaimase~! Oh! Genzō-jii!', { expr: 'joy', name: 'Yuki' });
    B.stopAction(); B.faceTo(G.x, G.z);
    D.shake(0.08);
    await D.shout(B, 'GENZŌ! You old turtle! About time you came out of that shop!', { expr: 'laugh', act: 'wave', name: 'Bendo' });
    G.setExpr('laugh');
    await D.say(G, 'Ho ho! Bendo! Two of your finest, if you please. I\'ve brought my grandson.', { expr: 'laugh' });
    B.faceTo(P.x, P.z);
    B.setExpr('surprised');
    await D.say(B, '...This is Mamoru? Last time I saw you, you were THIS big!', { expr: 'joy', act: 'holdOut' });
    P.play('bow');
    P.setExpr('shy');
    await D.say(P, '...Good evening.', { expr: 'shy' });
    // ---- to Grandpa's usual table; Bendo comes out of the kitchen
    D.mark('table');
    const T = L.dinnerTable, tx = T.position.x, tz = T.position.z;
    const sY = (c) => T.userData.seatY + 0.02 - c.dims.hipY * 0.05 * c.scale + 0.03;
    G.walkTo(tx - 0.95, tz + 0.15, { nav: null });
    await D.walk(P, tx + 0.95, tz + 0.15, { free: true });
    await D.wait(0.3);
    G.setPos(tx - 0.72, tz); G.faceNow(Math.PI / 2 - 0.45); G.setPose('sit'); G.y = sY(G); G.idleT = 999;
    P.setPos(tx + 0.72, tz); P.faceNow(-Math.PI / 2 + 0.45); P.setPose('sit'); P.y = sY(P); P.idleT = 999;
    Y.walkTo(-1.7, -0.5, { nav: L.nav });
    B.walkTo(tx - 0.05, tz - 0.62).then(() => B.faceYaw(0));
    await D.cam({ x: tx, y: 0.85, z: tz, wupp: 0.0074, pitch: 20, dur: 1.6, clip: 1.6 });
    // ---- forty years of stories (Mamo's not in them)
    D.mark('stories');
    P.hold(phoneMesh(), 'R');
    P.play('phone', { loop: true, scroll: true });
    P.setExpr('hollow', { react: false });
    const banter = [
      [B, 'Remember the summer the typhoon took your sign clean off? We found it at the station!', 'laugh'],
      [G, 'And you swore it was the tanuki! For a whole week!', 'laugh'],
      [B, 'It WAS the tanuki.', 'smug'],
      [G, 'Ho ho ho! And the time Ponta\'s father fell in the canal—', 'laugh'],
    ];
    for (const [c, line, e] of banter) await D.say(c, line, { expr: e, auto: 1.8, act: c === B ? 'clap' : null });
    await D.cam({ x: P.x - 0.1, y: 0.7, z: P.z, wupp: 0.005, pitch: 16, dur: 1.2, clip: 1.2 });
    await D.think(P, '...They have a lot to talk about.', { auto: 1.6 });
    await D.think(P, '(I should\'ve just stayed upstairs.)', { auto: 1.6 });
    // ---- omurice
    D.mark('omurice');
    // Bendo heads back to the stove; Yuki brings the plate
    await D.say(B, 'Right! Something special for the boy.', { expr: 'determined', name: 'Bendo' });
    B.walkTo(1.9, -1.7, { nav: null }).then(() => { B.faceYaw(Math.PI); B.play('cook', { loop: true }); g.audio?.play?.('sizzle', { volume: 0.5 }); });
    await D.cam({ x: 1.4, y: 1.0, z: -1.2, wupp: 0.0085, pitch: 22, dur: 1.2, clip: 1.8 });
    await D.wait(2.0);
    await D.say(B, 'Order up! One omurice!', { expr: 'happy', name: 'Bendo' });
    B.stopAction();
    const plate = omurice();
    Y.walkTo(1.3, -0.45, { nav: null });
    await D.wait(1.0);
    Y.hold(plate, 'R'); Y.play('serve', { loop: true });
    await D.cam({ x: tx, y: 0.85, z: tz, wupp: 0.0074, pitch: 20, dur: 1.2, clip: 1.6 });
    await Y.walkTo(tx + 0.12, tz - 0.62, { nav: null });
    Y.faceTo(P.x, P.z); Y.stopAction();
    const pl = Y.drop('R');
    L.scene.add(pl);
    pl.position.set(tx + 0.08, T.userData.seatY + 0.22, tz + 0.05); pl.rotation.y = -0.2;
    g.audio?.play?.('plate', { volume: 0.5 });
    P.stopAction(); P.drop('R');
    P.lookAt(pl, 1);
    Y.setExpr('happy');
    await D.say(Y, 'Here you go~! Bendy\'s special omurice!', { expr: 'happy', name: 'Yuki' });
    Y.hold(ketchup(), 'R');
    await D.say(Y, 'What should I draw on it?', { expr: 'smile', act: 'headTilt' });
    P.setExpr('awkward');
    await D.say(P, '...Whatever.', { expr: 'awkward' });
    Y.setExpr('thinking');
    await D.wait(0.6);
    Y.setExpr('excited');
    D.emote(Y, 'idea');
    await D.wait(0.5);
    // she draws — close on the plate
    D.mark('draw');
    await D.cam({ x: pl.position.x - 0.05, y: pl.position.y, z: pl.position.z + 0.1, wupp: 0.0034, pitch: 66, dur: 1.0, clip: 1.4 });
    Y.play('draw', { loop: true });
    g.audio?.play?.('squeeze', { volume: 0.4 });
    await D.tween((k) => pl.userData.drawTurtle(k), 2.4, (x) => x);
    Y.stopAction();
    await D.wait(0.5);
    await D.cam({ x: (P.x + Y.x) / 2, y: 0.9, z: tz, wupp: 0.0062, pitch: 18, dur: 0.9, clip: 1.4 });
    Y.setExpr('joy');
    await D.say(Y, 'Ta-da! It\'s you!', { expr: 'joy', act: 'cheer' });
    P.lookAt(null);
    P.setExpr('surprised');
    await D.wait(0.7);
    P.setExpr('flustered');
    D.emote(P, 'heart');
    g.audio?.play?.('sparkle', { volume: 0.3 });
    await D.wait(0.9);
    P.setExpr('shy');
    await D.say(P, '...Thanks.', { expr: 'shy' });
    Y.setExpr('smile');
    await D.say(Y, 'I\'m Yuki, by the way. Welcome to Kodama Ginza, Mamoru-kun!', { expr: 'smile', name: 'Yuki' });
    // the two old men exchange a look
    B.stopAction(); B.walkTo(tx - 0.42, tz - 0.66, { nav: null }).then(() => { B.faceYaw(0); B.lookAt(G.root, 1); });
    await D.cam({ x: tx, y: 0.85, z: tz, wupp: 0.0074, pitch: 20, dur: 1.0, clip: 1.6 });
    G.lookAt(B.root, 1);
    G.setExpr('smug'); B.setExpr('smug');
    await D.wait(1.4);
    G.lookAt(null); B.lookAt(null);
    // he eats
    D.mark('eat');
    P.play('eat', { loop: true });
    P.setExpr('delicious');
    await D.wait(1.6);
    await D.say(P, '...It\'s really good.', { expr: 'gentle' });
    B.setExpr('laugh');
    await D.say(B, 'HA! Of course it\'s good! Eat up, eat up!', { expr: 'laugh', act: 'hipsHands', name: 'Bendo' });
    await D.wait(0.8);
    await D.fadeOut(1.4);
    P.stopAction(); P.setPose('stand'); P.y = 0;
    for (const c of [G, B, Y]) L.remove(c);
  });
}

function ketchup() {
  const v = new VoxelModel();
  fill(v, -1, 1, 0, 6, -1, 1, 0xd8201a); fill(v, 0, 0, 7, 9, 0, 0, 0xf4f0e8); fill(v, -1, 1, 3, 4, 2, 2, 0xffffff);
  return vm(v, V25, [0, 4, 0]);
}
