import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` -> regular multi-file build in dist/
// `npm run build:single` -> one self-contained HTML file in dist-single/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  server: { host: true },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    target: 'es2022',
    // the single-file page is published as an Artifact; keep identifiers readable there
    minify: mode === 'single' ? false : 'esbuild',
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
}));
