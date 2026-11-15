import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so the built bundle loads over file:// inside Electron.
  base: './',
  plugins: [react()],
  server: {
    port: 4040,
    host: true,
  },
  preview: {
    port: 4040,
    host: true,
  },
})
