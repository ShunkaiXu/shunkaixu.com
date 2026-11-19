// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://shunkaixu.com',
  output: 'static',
  // Write about.html (not about/index.html); Cloudflare serves it at /about.
  build: { format: 'file' },
  vite: {
    // Pre-bundle three.js up front so the dev server doesn't reload the page mid-load.
    optimizeDeps: {
      include: [
        'three',
        'three/addons/environments/RoomEnvironment.js',
        'three/addons/loaders/GLTFLoader.js',
        'three/addons/utils/BufferGeometryUtils.js',
        'three/addons/libs/meshopt_decoder.module.js',
      ],
    },
  },
});
