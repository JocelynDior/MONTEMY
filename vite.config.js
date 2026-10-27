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
