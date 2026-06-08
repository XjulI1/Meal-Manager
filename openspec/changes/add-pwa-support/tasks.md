# Tasks

Checklist d'implémentation du change `add-pwa-support`. Aucun code domaine touché
(uniquement transport/UI/build) ; chaque section laisse l'app exécutable
(`pnpm build` OK, `pnpm test` vert).

## 1. Dépendance & module

- [x] 1.1 Ajouter `@vite-pwa/nuxt` en devDependency (`pnpm add -D`).
- [x] 1.2 Enregistrer le module dans `nuxt.config.ts` (`modules`).

## 2. Icônes

- [x] 2.1 Créer `scripts/generate-pwa-icons.mjs` (encodeur PNG pur Node, supersampling 4×).
- [x] 2.2 Générer `public/pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` (safe-zone), `apple-touch-icon-180x180.png`.
- [x] 2.3 Créer `public/favicon.svg` vectoriel assorti.

## 3. Manifest & config PWA

- [x] 3.1 Bloc `pwa.manifest` dans `nuxt.config.ts` (name, short_name, description, lang `fr-FR`, display `standalone`, theme/background color, start_url, scope, icons + maskable).
- [x] 3.2 Bloc `pwa.workbox` : `globPatterns`, `navigateFallback: '/'`, `navigateFallbackDenylist` (`/api/`, `/mcp`, `/.well-known/`), `cleanupOutdatedCaches`, `clientsClaim`, `skipWaiting`.
- [x] 3.3 `registerType: 'autoUpdate'`, `client.installPrompt: true`, `devOptions.enabled: false`.

## 4. Head & injection du lien manifest

- [x] 4.1 `app.head` : metas `description`, `theme-color`, `apple-mobile-web-app-*`, `mobile-web-app-capable` ; liens `icon` (favicon.svg) et `apple-touch-icon`.
- [x] 4.2 Monter `<VitePwaManifest />` dans `app.vue` (injection client du lien manifest — le module retire les liens manifest statiques).

## 5. Affordances install / update

- [x] 5.1 Créer `app/components/PwaPrompt.vue` (piloté par `$pwa` : `showInstallPrompt`/`install`/`cancelInstall` et `needRefresh`/`updateServiceWorker`/`cancelPrompt`).
- [x] 5.2 Monter `<PwaPrompt />` dans `app.vue`.

## 6. Build housekeeping

- [x] 6.1 `.gitignore` : ajouter `dev-dist/`.

## 7. Tests intégration

- [x] 7.1 Créer `tests/integration/http/pwa-assets.test.ts` : présence et validité du manifest généré + des icônes référencées dans `public/`.

## 8. Documentation

- [x] 8.1 `README.md` : section PWA (installation, stratégie de cache, régénération des icônes).
- [x] 8.2 `docs/COMMITS.md` : ajouter le scope `pwa`.

## 9. Vérification finale

- [x] 9.1 `pnpm lint` vert.
- [x] 9.2 `pnpm typecheck` vert.
- [x] 9.3 `pnpm test` vert.
- [x] 9.4 `pnpm build` produit `manifest.webmanifest`, `sw.js`, `workbox-*.js`.
- [x] 9.5 `npx -y -p @fission-ai/openspec@latest openspec validate add-pwa-support` vert.

## Vérification manuelle (post-déploiement)

- [ ] `curl -sI /manifest.webmanifest` → 200, `Content-Type: application/manifest+json`.
- [ ] `curl -s /manifest.webmanifest | jq .` → name, icons[], display `standalone`.
- [ ] `curl -sI /sw.js` → 200, `Content-Type: text/javascript`.
- [ ] Chrome DevTools → Application → Manifest : « Installable », icônes affichées.
- [ ] Lighthouse PWA : installable, manifest valide, icône maskable OK.
- [ ] Mobile : « Ajouter à l'écran d'accueil » → ouvre en plein écran (standalone).
