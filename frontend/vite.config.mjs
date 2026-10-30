import fs from 'node:fs'

import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
)

// https://vitejs.dev/config/
export default ({ command }) => {
  return defineConfig({
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    // Strip console.* / debugger from production bundles only, so dev logging
    // is untouched. `command` is 'build' for `vite build`, 'serve' for the dev server.
    esbuild: {
      drop: command === 'build' ? ['console', 'debugger'] : [],
    },
    plugins: [
      react(),
      VitePWA({
        includeAssets: [
          'favicon.ico',
          'robots.txt',
          'apple-touch-icon.png',
          'mstile-150x150.png',
        ],
        injectManifest: {
          globIgnores: ['index.html'],
          globPatterns: ['**/*.{js,css,html,png,svg}'],
        },
        manifest: {
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              sizes: '192x192',
              src: '/android-chrome-192x192.png',
              type: 'image/png',
            },
            {
              sizes: '512x512',
              src: '/android-chrome-512x512.png',
              type: 'image/png',
            },
            {
              sizes: '64x64',
              src: 'pwa-64x64.png',
              type: 'image/png',
            },
            {
              sizes: '192x192',
              src: 'pwa-192x192.png',
              type: 'image/png',
            },
            {
              sizes: '512x512',
              src: 'pwa-512x512.png',
              type: 'image/png',
            },
            {
              purpose: 'maskable',
              sizes: '512x512',
              src: 'maskable-icon-512x512.png',
              type: 'image/png',
            },
          ],
          name: 'Wuzzanext: Simplify Tasks & Chores, Together.',
          short_name: 'Wuzzanext',
          theme_color: '#ffffff',
        },
        registerType: 'prompt',
        workbox: {
          // Don't leave separate service-worker source maps in dist.
          sourcemap: false,
          maximumFileSizeToCacheInBytes: 6000000, // 6MB
          //Exclude API and Swagger routes from service worker navigation fallback
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/wuzzanext-source\.tar\.gz$/,
            /^\/api\//, // Exclude all API routes
            /^\/swagger/, // Exclude all Swagger routes
          ],
          // Do not use skipWaiting/clientsClaim with the prompt flow. The new
          // worker activates only after the user accepts the in-app update.
          skipWaiting: false,
        },
      }),
    ],

    resolve: {
      alias: [
        {
          find: '@',
          replacement: '/src',
        },
      ],
    },
  })
}
