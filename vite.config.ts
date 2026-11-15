import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build-time version info: version from package.json, short commit hash and
// branch from git. Falls back gracefully when git is unavailable.
function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const branch = git('rev-parse --abbrev-ref HEAD')
const isBeta = branch === 'beta'
const commit = git('rev-parse --short HEAD')
const appVersion = `v${pkg.version}${isBeta ? '-beta' : ''}${commit ? ` (${commit})` : ''}`

// The app is served under this path on the production server
// (https://sphings-dev.de/marstek/marstek-fw-checker/), same pattern as the
// Venus Control tool at /marstek/control/.
export default defineConfig({
  plugins: [react()],
  base: '/marstek/marstek-fw-checker/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
