import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is served under this path on the production server
// (https://sphings-dev.de/marstek/marstek-fw-checker/), same pattern as the
// Venus Control tool at /marstek/control/.
export default defineConfig({
  plugins: [react()],
  base: '/marstek/marstek-fw-checker/',
  server: {
    // In dev, the backend (marstek-server.js — the proxy + GitHub archive
    // functions) runs on :3000. Forward the function calls to it so the
    // frontend code path is identical to production.
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
