import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const DGFIP_ORIGIN = 'https://simulateur-ir-ifi.impots.gouv.fr';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // En développement, Vite joue le rôle du relais Cloudflare (functions/api/dgfip/[year].ts)
    // pour contourner l'absence d'en-têtes CORS du simulateur de la DGFiP.
    proxy: {
      '^/api/dgfip/\\d{4}$': {
        target: DGFIP_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => `/cgi-bin/calc-${path.split('/').pop()}.cgi`,
      },
    },
  },
});
