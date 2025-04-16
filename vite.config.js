import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy'


export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'public/snap.bin',
          dest: ''
        }
      ]
    })
  ]
});

