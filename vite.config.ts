import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'robots.txt'],
      manifest: {
        name: 'Dev Tools — JSON, Diff, JWT and more',
        short_name: 'Dev Tools',
        description:
          'Developer utilities that run entirely in your browser: JSON to Excel/CSV, format converters, diff viewer, JWT decoder, hashing, Base64 and more.',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache only the shell. Monaco and the tokenizer rank tables are
        // megabytes each; forcing them into the precache would make a first
        // visit download every tool's dependencies before the page is usable.
        // They are cached on first use instead, which still works offline
        // afterwards.
        maximumFileSizeToCacheInBytes: 600 * 1024,
        globPatterns: ['**/*.{css,html,svg,woff2}', 'assets/index-*.js', 'assets/react-*.js'],
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/, /^\/ads\.txt$/],
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) =>
              request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-assets',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    // No manualChunks here on purpose. Rollup already splits on every
    // dynamic import boundary, which is exactly what we want: one chunk per
    // lazily-routed tool, with Monaco, the tokenizer ranks and html2pdf landing
    // in chunks of their own that only load when a tool needs them. Hand-rolled
    // chunk groups kept pulling Monaco into the entry's preload list.
    chunkSizeWarningLimit: 1500,
  },
});
