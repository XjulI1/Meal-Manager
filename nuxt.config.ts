// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },

  ssr: false,

  future: {
    compatibilityVersion: 5,
  },

  modules: ['@nuxt/ui', '@nuxt/eslint', '@pinia/nuxt', 'nuxt-auth-utils', '@vite-pwa/nuxt'],
  vite: {
    optimizeDeps: {
      include: ['zod'],
    },
    build: {
      rollupOptions: {
        output: {
          // Isole le WASM libheif (paquet `heic-to`, ~2.9 Mo, embarqué dans le
          // JS et chargé en lazy uniquement à la conversion d'une photo HEIC)
          // dans un chunk au nom stable, afin de l'exclure proprement du
          // précache PWA — voir `pwa.workbox` plus bas.
          manualChunks(id) {
            if (id.includes('/heic-to/')) return 'heic-to'
          },
          // Réplique le défaut Nuxt (`_nuxt/[hash].js`) et donne un nom au seul
          // chunk heic pour que `globIgnores` puisse le cibler de façon stable.
          chunkFileNames(chunkInfo) {
            return chunkInfo.name === 'heic-to' ? '_nuxt/heic-to.[hash].js' : '_nuxt/[hash].js'
          },
        },
      },
    },
  },
  css: ['~/assets/css/main.css'],

  // Le service worker et le manifest portent un nom stable (`/sw.js`,
  // `/manifest.webmanifest`) : sans `Cache-Control` explicite, le CDN (Cloudflare)
  // les met en cache et sert un `sw.js` périmé, ce qui empêche `autoUpdate` de
  // détecter une nouvelle version. On force une revalidation systématique (valeur
  // recommandée par vite-pwa). Les chunks `_nuxt/[hash].js` gardent l'immutabilité
  // par défaut de Nitro (leur nom change à chaque build).
  routeRules: {
    '/sw.js': {
      headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
    },
    '/manifest.webmanifest': {
      headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    databaseUrl: '',
    // Anthropic Claude API config (recipe AI assistant) — server-only, never
    // under `public`. Overridable at runtime via NUXT_ANTHROPIC_* env vars;
    // defaults below are the current values.
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-5',
    anthropicChatEffort: 'medium',
    anthropicImportEffort: 'low',
    anthropicPhotoEffort: 'low',
    anthropicLabelEffort: 'medium',
    // Filesystem directory where persisted wine-label photos are written and
    // served from. Overridable via NUXT_WINE_LABEL_DIR; mount a volume in Docker.
    wineLabelDir: '.data/wine-labels',
    session: {
      password: '',
      cookie: {
        // h3 sets `secure: true` by default, which the browser rejects over HTTP
        // (localhost in dev). Keep Secure cookies in production only.
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  ui: {
    global: true,
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },

  imports: {
    dirs: ['shared/**'],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr-FR' },
      title: 'Meal Manager',
      meta: [
        {
          name: 'description',
          content:
            "Gérez l'inventaire, les recettes, les menus et la liste de courses de votre foyer.",
        },
        { name: 'theme-color', content: '#28a24b' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
        { name: 'apple-mobile-web-app-title', content: 'Meal Manager' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        {
          rel: 'icon',
          href: '/favicon-32.png',
          type: 'image/png',
          sizes: '32x32',
        },
        {
          rel: 'icon',
          href: '/favicon-16.png',
          type: 'image/png',
          sizes: '16x16',
        },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon-180x180.png',
          sizes: '180x180',
        },
      ],
    },
  },

  // PWA : application installable (manifest + service worker). L'app étant en
  // SPA (`ssr: false`), le SW précache le shell ; les appels `/api` et `/mcp`
  // restent network-only (données par foyer, offline non supporté en v1 —
  // voir openspec/project.md).
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Meal Manager',
      short_name: 'Meal Manager',
      description:
        "Gérez l'inventaire, les recettes, les menus et la liste de courses de votre foyer.",
      lang: 'fr-FR',
      dir: 'ltr',
      theme_color: '#28a24b',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      categories: ['food', 'lifestyle', 'productivity'],
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      // Le chunk `heic-to` (~2.9 Mo, WASM libheif) dépasse la limite de précache
      // de Workbox (2 MiB) et ne sert qu'à convertir une photo HEIC d'iPhone :
      // on l'exclut du précache (install PWA légère, ~1.3 Mo) et on le met en
      // cache à la volée, au premier usage seulement.
      globIgnores: ['**/heic-to.*.js'],
      runtimeCaching: [
        {
          urlPattern: /\/_nuxt\/heic-to\..*\.js$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'heic-wasm',
            expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/mcp/, /^\/\.well-known\//],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
      type: 'module',
    },
  },

  experimental: {
    viteEnvironmentApi: true,
  },
})
