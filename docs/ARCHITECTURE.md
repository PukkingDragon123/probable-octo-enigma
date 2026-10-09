# Kodamaya — architecture & art conventions

Plain JavaScript ES modules, three.js 0.180, Vite. No image/audio files: every
model, texture, sprite, poster and sound is generated in code.

## Look

- **Low-poly 3D + pixel-art textures** for characters, buildings, furniture,
  props, terrain. **2D pixel sprites** (billboards) for foliage, grass tufts,
  flowers, particles, small signs, birds/insects, effects.
- The scene renders into a low-res target (~960x540 on 1080p) and is upscaled
  with nearest filtering + depth outline + bloom + colour grade
  (`src/core/renderer.js`). Grades: `human`, `humanNight`, `spirit`,
  `spiritDusk`, `melancholy`, `cozy`.
- Reference quality bar: the latest *The Bear Must Eat* (lush, dense, painterly
  pixel foliage, everything hand-placed and alive) — but low-poly, not voxel,
  and higher resolution.
- Human World = grounded, believable, detailed, a little faded (old Japanese
  shopping street). Spirit Realm = warm, grassy, magical, Ghibli-like.
- Palettes: use hue-shifted ramps (`ramp()` in pixtex.js): shadows drift to
  violet, highlights to warm yellow. Never pure black outlines — use dark warm
  purple-browns (`#2a1828`-ish).

## Units & orientation

- 1 unit = 1 metre. y up. Ground at y = 0 unless a scene says otherwise.
- Characters face **+z** at yaw 0. Their right hand is on −x.
- The gameplay camera is orthographic, pitch ~38°, `wupp` (world units per
  low-res pixel) ~0.012–0.016 for gameplay, ~0.004–0.008 for close-ups.
- Default view yaw 0 = camera at +z looking towards −z, so building fronts that
  face **+z** are seen head-on.

## Core modules (src/core)

| module | what |
| --- | --- |
| `renderer.js` | `PixelRenderer` (render, grades, iris, fade, letterbox, cloud-sea fog) |
| `camera.js` | `CameraRig` (follow, `play({x,y,z,wupp,pitch,yaw,dur,ease})` shots, picking helpers) |
| `pixtex.js` | `PixCanvas` pixel painter (rect, line, ellipse, rrect, poly, dither, scatter, noiseFill, stamp, crisp `text`, outline) + `ramp/mix/darken/lighten`, `makeTexture`, `cached`. **TPM = 64 texels/m.** |
| `lowpoly.js` | `GeoBuilder` / `ModelBuilder`: merge primitives (box, cbox, bbox, cyl, cone, sphere, lathe, extrude, prism) with box-projected UVs at 64 texels/m, vertex colour tint, per-vertex wind weight |
| `materials.js` | `litMat` (cel bands, cloud shadows, wind sway, rim, wet puddles, dither fade, height clip), `emitMat` (glow + flicker modes 0 steady,1 fluorescent,2 dying,3 candle,4 neon,5 blink,6 pulse; `uOn` night switch), `glassMat`, `blobShadowMat`, global `WORLD` uniforms |
| `sprites.js` | `Atlas` (pack named pixel drawings) + `SpriteBatch` (instanced billboards: modes 0 upright, 1 flat, 2 camera-facing; sway, push-aside, emissive, alpha dither) |
| `particles.js` | `Particles.emit(preset, {x,y,z,n,...})`, `addEmitter({type, area|pos, rate})`. Presets: dustPuff, dustMote, sunMote, steam, smoke, mist, leaf, leafAutumn, petal, pollen, firefly, spiritMote, sparkle, confetti, rain, waterSplash, bubble, sweat, heart, note, zzz, dustball, crumbs, feather, grassBits, teaLeaves, happyGlow, portalSwirl |
| `input.js` | gestures: tap, hold, dragstart/drag/dragend, zoom, key |
| `nav.js` | `NavGrid` (block rects/circles/OBBs, A* + smoothing) |
| `util.js` | math, easing `EASE`, keyframes `K`, rng, noise, `Emitter` |

## Shared art

- `src/art/textures.js`: `tex(name, opts)` cached repeat textures — woodFloor,
  woodPanel, siding, yakisugi, tatami, tile, checker, terrazzo, pavers,
  asphalt, concrete, plaster, brick, kawara, metalSheet, shutter, cardboard,
  shoji, grass, dirt, stone, cobble, moss, sand, thatch, bamboo, water, paint.
  Use them with `GeoBuilder` 'world' UVs (they tile at 64 texels/m).
- Fonts (`src/ui/fonts.js`, `FONT.*`): Galmuri11/9/7/14 pixel fonts (UI,
  dialogue, small labels — Latin + Japanese), display fonts for painting signs
  and posters: `Dela Gothic One` (bold), `RocknRoll One`, `Mochiy Pop One`,
  `DotGothic16`, `Rampart One` (outlined), `Yusei Magic` (brush), `Hachi Maru
  Pop` (cute), `Potta One` (chunky), `Reggae One`. Always `await loadFonts()`
  before painting text, and use `PixCanvas.text()` (crisp, thresholded).
  **After adding new Japanese characters run `python3 tools/fonts/build_fonts.py`.**

## Characters (src/entities)

- `rig.js` `Character(def)`: procedural chibi rig. `setPos`, `faceTo`, `walkTo(x,z,{nav,run})`,
  `setExpr(name)`, `play(action, opts)` (wave, bow, nod, shake, sweep, wipe, carry,
  hug, beHugged, crank, insertCoin, give, openCapsule, cheer, jump, trip, scratchHead,
  facepalm, shrug, sigh, point, clap, eat, drink, sob, sleep, yawn, push, grind, whisk,
  pour, water, harvest, flail, hipsHands, handsBack, fan, keyTurn, rollShutter,
  phone, holdOut, pickup, putdown, ...), `hold(obj, 'R'|'L'|'both'|'head')`,
  `setPose('stand'|'sit'|'seiza'|'floor'|'crouch'|'lie')`, `lookAt(target)`, `squash(k)`.
- `face.js`: animated pixel faces, `EXPRESSIONS` (neutral, sad, happy, joy, excited,
  crying, angry, furious, embarrassed, shy, flustered, awkward, surprised, shocked,
  smug, thinking, love, sleepy, determined, delicious, left_out, greedy, ...).
- Cast definitions: `src/data/characters.js`.

## Scenes / buildings

- Each location builds into a THREE.Group / Scene. Buildings should expose
  their roof / front walls as separate meshes using shared `fade` / `clip`
  uniforms (`litMat({ fade, clip })`) so the camera can cut away into interiors.
- Interactable props: give them `userData.interact = { id, label }` and keep
  their meshes reasonably compact (they get raycast).
- Lights that turn on at night: `emitMat({ onU: sharedOnUniform, mode })` and
  real `PointLight`s only for the few important ones (≤ 8 per scene).

## Dev

- Previews: `tools/preview/*.html` using `tools/preview/harness.js`.
- Screenshots: `node tools/shot.mjs <url> <out.png> [w] [h] [wait] [js]`.
- Don't add image/audio assets. Don't add npm dependencies without need.
