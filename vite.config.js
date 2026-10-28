import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Phase 27: installable PWA.
//  - The app shell (JS, CSS, icons) is precached, so the app opens instantly and offline.
//  - API reads (GET) go network first and fall back to the last copy when offline. That cache is
//    emptied on logout (see logout() in src/supabase/authHelpers.js).
//  - Private signed file links and anything that writes (POST/PUT/DELETE) are never cached.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  let apiOrigin = null
  try { apiOrigin = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : null } catch { /* ignore */ }

  return {
    // Phase 28: split the bundle so people only download what they use. React, the router and Supabase are
    // separate (and cache well across deploys); each role's pages sit in their own chunk.
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (/node_modules\/(react-router|react-router-dom|@remix-run)\//.test(id)) return 'router'
              if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
              if (/node_modules\/@supabase\//.test(id)) return 'supabase'
              return undefined
            }
            const role = id.match(/\/src\/pages\/(student|teacher|parent|principal|tutor|schoolmember|admin)\//)
            return role ? `role-${role[1]}` : undefined
          },
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: false,                       // we ship our own public/manifest.json
        includeAssets: ['icons/*.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            ...(apiOrigin ? [{
              urlPattern: ({ url, request }) => request.method === 'GET' && url.origin === apiOrigin,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'montemy-api',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [200] },
              },
            }] : []),
            {
              // Public logos and profile photos only (private files use signed links, which are not matched)
              urlPattern: /\/storage\/v1\/object\/public\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'montemy-images',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
  }
})
