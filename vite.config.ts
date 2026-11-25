import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Home Front Command alerts in a plain browser: the feed blocks other sites (CORS) and expects its
 * own headers, so the dev and preview servers relay it at /oref-alerts. (The Electron kiosk fetches
 * it directly from the main process.) The feed usually answers only from Israeli IP addresses.
 */
const orefProxy: Record<string, ProxyOptions> = {
  '/oref-alerts': {
    target: 'https://www.oref.org.il',
    changeOrigin: true,
    rewrite: () => '/WarningMessages/alert/alerts.json',
    headers: {
      Referer: 'https://www.oref.org.il/',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    },
  },
}

export default defineConfig({
  // Relative base so the built bundle loads over file:// inside Electron.
  base: './',
  plugins: [react()],
  server: {
    port: 4040,
    host: true,
    proxy: orefProxy,
  },
  preview: {
    port: 4040,
    host: true,
    proxy: orefProxy,
  },
})
