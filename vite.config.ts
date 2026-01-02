import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages deployment: only set base for production build
  base: command === 'build' ? '/signstream/' : '/',
}))
