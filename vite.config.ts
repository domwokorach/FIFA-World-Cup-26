import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' + HashRouter => the built app works from any static path (file://, sub-folder, GitHub Pages)
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: '2026 World Cup Open Source Companion',
        short_name: '2026 WC',
        description:
          '2026 World Cup: schedule, groups, bracket, teams, venues, weather, where to watch, win probabilities and tournament forecast, in 23 languages. Unofficial open-source PWA',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0e15',
        theme_color: '#0b0e15',
        categories: ['sports'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Matches',
            url: './#/',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Groups',
            url: './#/groups',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Bracket',
            url: './#/bracket',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        screenshots: [
          {
            src: 'icons/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
          },
          {
            src: 'icons/screenshot-narrow.png',
            sizes: '750x1334',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // app shell + all local assets (flags, badges, fonts) are precached for offline;
        // the daily-updated data JSONs are runtime-cached instead so they stay fresh;
        // the 22 non-English language chunks are runtime-cached so each user only
        // stores the language they actually use
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['data/**', '**/i18n-*.js'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // live-scores data must be fresh on every load: network first,
            // cache fallback within 4s for offline / flaky connections
            urlPattern: ({ url }) => url.pathname.includes('/data/') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wc-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // language chunks are content-hashed, so they are safe to cache forever
            urlPattern: /assets\/i18n-.*\.js/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wc-i18n',
              expiration: { maxEntries: 30 },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // name each language dictionary chunk i18n-<lang> so the SW config can
        // exclude them from precache and runtime-cache them instead
        // (en ships in the main bundle as the fallback dictionary)
        manualChunks(id) {
          const m = id.match(/src\/i18n\/([\w-]+)\.ts$/)
          if (m && m[1] !== 'en' && m[1] !== 'strings') return `i18n-${m[1]}`
        },
      },
    },
  },
})
