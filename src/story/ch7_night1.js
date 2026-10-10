// Chapter 7 — the first night.
// Lights out. Moonlight on the tatami. Mamo sits up in the futon with his
// phone, puts it down, looks at the window. "Dad grew up in this room."
// He falls asleep sitting up. Under the desk, a clump of dust opens two
// googly eyes, hops once, and is gone. — DAY 1.
import { dustBunny } from '../locations/mamoroom.js';

export async function night1Chapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('mamoroom', {}, { transition: null });
  L.setNight();
  await D.cutscene(async () => {
    g.renderer.uniforms.fade.value = 1;
    g.renderer.setGrade?.('humanNight', 0);
    g.place(P, 0.3, 0.55, 0);
    P.setHood(false);
    P.setPose('sit'); P.y = 0.04; P.idleT = 999;
    P.setExpr('tired', { react: false });
    D.cam({ x: 0.2, y: 0.8, z: 0.2, wupp: 0.0092, pitch: 30, dur: 0 });
    g.audio?.ambience?.('nightRoom');
    await D.fadeIn(1.6);
    await D.wait(0.8);
    await D.cam({ x: 0.3, y: 0.55, z: 0.55, wupp: 0.006, pitch: 20, dur: 2.4, ease: 'inOutSine', clip: 1.4 });
    P.lookAt({ x: 1.5, y: 1.6, z: -2.4 }, 1);
    await D.think(P, '...Dad grew up in this room.', { auto: 2.0 });
    await D.wait(0.6);
    P.setExpr('sad');
    await D.think(P, '...', { auto: 1.2 });
    P.lookAt(null);
    P.play('yawn');
    await D.wait(2.0);
    P.setExpr('sleepy');
    P.play('sleep', { loop: true });
    await D.wait(0.8);
    P.setExpr('asleep');
    D.emote(P, 'zzz');
    await D.wait(1.0);
    // under the desk, something is awake
    D.mark('dust');
    const b = dustBunny(9, 5);
    b.position.set(1.15, 0, -1.25);
    L.scene.add(b);
    await D.cam({ x: 1.15, y: 0.2, z: -1.0, wupp: 0.0038, pitch: 16, dur: 1.6, ease: 'inOutSine', clip: 1.0 });
    await D.wait(0.6);
    b.userData.eyes.visible = true;
    g.audio?.play?.('pop', { volume: 0.25, pitch: 1.8 });
    await D.wait(0.5); b.userData.eyes.visible = false; await D.wait(0.15); b.userData.eyes.visible = true;
    await D.wait(0.9);
    await D.tween((k) => { b.position.y = Math.sin(k * Math.PI) * 0.12; b.scale.set(1 - Math.sin(k * Math.PI) * 0.15, 1 + Math.sin(k * Math.PI) * 0.2, 1); }, 0.45);
    g.audio?.play?.('poof', { volume: 0.25 });
    g.particles?.emit('dustPuff', { x: b.position.x, y: 0.12, z: b.position.z, n: 4 });
    L.scene.remove(b);
    await D.wait(0.8);
    await D.fadeOut(2.0);
    P.stopAction(); P.setPose('stand'); P.y = 0;
    await D.title('Day 1', 'The first day at Kodamaya', 2.6);
  });
}
