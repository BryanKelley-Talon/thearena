import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Flashpoint games deploy to Netlify at the site root, so base stays "/".
export default defineConfig({
  plugins: [react()],
  server: { port: 5175, strictPort: true, host: true, open: false },
  build: {
    outDir: 'dist',
    // Keep the payload honest against the school-wifi weight rule.
    chunkSizeWarningLimit: 700,
  },
})
