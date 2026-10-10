// The end of what's written so far: free roam in the Spirit garden (isometric)
// with the Hokori pottering about. Tap to walk; Q / E to turn the camera.
export async function freeChapter(g) {
  const D = g.director;
  const P = g.player;
  const L = await g.goTo('spirit', {}, { transition: null });
  L.revealIslands(0.01);
  L.setHokori(true);
  g.place(P, -4.6, 3.4, 0.8);
  P.setHood(false);
  P.setExpr('smile', { react: false });
  g.renderer.uniforms.fade.value = 1;
  D.follow(P);
  await D.fadeIn(1.2);
  g.audio?.music?.('spirit', { volume: 0.5 });
  D.caption('Free roam · more of Kodamaya coming soon', { dur: 4, kind: 'place' });
}
