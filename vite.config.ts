import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use '/signstream/' only on GitHub Actions, otherwise use '/' (for Vercel/Local)
  base: process.env.GITHUB_ACTIONS === 'true' ? '/signstream/' : '/',
})
