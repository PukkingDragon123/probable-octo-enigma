# Dev tools

- `npx vite --port 5173` then open `http://localhost:5173/tools/preview/<page>.html`.
- `node tools/shot.mjs <url> <out.png> [w] [h] [waitMs] [evalJs]` takes a headless
  Chromium (SwiftShader WebGL) screenshot; console errors are printed.
- `tools/preview/harness.js` sets up renderer / camera / lighting / particles for
  previews. URL params: `hour, zoom, pitch, yaw, cx, cy, cz, grade, mode, wet, rain`.
- `python3 tools/fonts/build_fonts.py` re-subsets the fonts after adding new
  Japanese text (run before builds).
