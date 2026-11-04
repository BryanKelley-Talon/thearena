import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// The short commit the SANDBOX tag shows (src/sandbox-tag.js). Cloudflare's build sets
// WORKERS_CI_COMMIT_SHA; a local or clean-clone build asks git. A sandbox build and the live
// build of the same commit get the same value, so a promote still serves identical bytes.
function shortCommit() {
  const ci = process.env.WORKERS_CI_COMMIT_SHA
  if (ci) return ci.slice(0, 7)
  try { return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

// Flashpoint games deploy to Netlify at the site root, so base stays "/".
export default defineConfig({
  plugins: [react()],
  define: { __COMMIT__: JSON.stringify(shortCommit()) },
  server: { port: 5175, strictPort: true, host: true, open: false },
  build: {
    outDir: 'dist',
    // Keep the payload honest against the school-wifi weight rule.
    chunkSizeWarningLimit: 700,
  },
})
