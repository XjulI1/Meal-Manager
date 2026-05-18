// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },

  ssr: false,

  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@pinia/nuxt',
    'nuxt-auth-utils',
  ],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    databaseUrl: '',
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
    },
  },
})
