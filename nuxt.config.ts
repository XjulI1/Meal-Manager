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

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    databaseUrl: '',
    session: {
      password: '',
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
