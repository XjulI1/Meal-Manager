# Design: PWA support

## Contexte technique

L'app est une **SPA Nuxt 4** (`ssr: false`) servie par Nitro. Le HTML retourné
est un *shell* statique dont le `<head>` provient de `app.head` (nuxt.config) ;
les appels `useHead()` dans les composants ne s'exécutent que **côté client**
après chargement du bundle. Ce détail conditionne plusieurs décisions ci-dessous.

## Décisions

### D1 — Module : `@vite-pwa/nuxt` plutôt qu'un SW maison

Le module officiel s'appuie sur Workbox (précache + revision hashing +
`cleanupOutdatedCaches`) et s'intègre nativement à Nuxt/Vite (génération du SW au
build, virtual modules `$pwa`). Écrire un service worker à la main pour une app
familiale serait du sur-mesure inutile et fragile (invalidation de cache).

### D2 — `registerType: 'autoUpdate'` + rechargement piloté par l'utilisateur

`autoUpdate` régénère le SW à chaque build et le module détecte la nouvelle
version (`needRefresh`). On **n'auto-recharge pas** silencieusement : `PwaPrompt`
affiche « Mise à jour disponible → Recharger » et c'est l'utilisateur qui
déclenche `updateServiceWorker()`. Motivation : éviter de perdre une saisie en
cours (formulaire d'inventaire, recette) par un reload surprise. `skipWaiting` +
`clientsClaim` garantissent que le reload applique bien la nouvelle version.

### D3 — Offline : shell uniquement, données network-only

`openspec/project.md` pose « Hors ligne : non pris en charge en v1 ». On respecte
cette contrainte : le SW précache uniquement les assets du shell
(`globPatterns: **/*.{js,css,html,svg,png,ico,woff2}`) et `navigateFallback: '/'`
sert la SPA pour toute navigation. Les requêtes `/api/*`, `/mcp` et
`/.well-known/*` sont **exclues** (`navigateFallbackDenylist`) et ne sont jamais
mises en cache → aucun risque de servir un inventaire périmé. Conséquence
assumée : hors réseau, l'app se lance mais affiche ses erreurs de chargement de
données normales. La valeur livrée est l'**installabilité** + le démarrage
rapide, pas le mode déconnecté.

### D4 — Injection du `<link rel="manifest">` en SPA

Le module **retire les liens manifest statiques** posés dans `app.head` (il veut
être seul maître du manifest, pour gérer `useCredentials`). Tenter de le déclarer
en dur dans `nuxt.config` ne fonctionne donc pas (vérifié : le lien disparaît du
HTML). La voie supportée est le composant `<VitePwaManifest />` monté dans
`app.vue`, qui injecte le lien via `useHead` **côté client**. En SPA le lien
n'est donc pas dans le shell statique mais ajouté au DOM après hydratation — ce
que les navigateurs prennent en compte pour les critères d'installation. Les
metas `theme-color` / Apple, elles, restent dans `app.head` (présentes dès le
shell) car le module n'y touche pas.

### D5 — Génération des icônes sans dépendance

L'environnement de build n'a ni `sharp`, ni ImageMagick, ni `rsvg`. Plutôt que
d'ajouter `@vite-pwa/assets-generator` (et ses dépendances natives),
`scripts/generate-pwa-icons.mjs` encode des PNG RGBA en **pur Node** (`zlib` +
CRC32) et dessine l'icône (fond vert dégradé + fourchette/couteau blancs) avec un
supersampling 4× pour des bords lisses. Les PNG sont commités dans `public/` (pas
de génération au build) ; le script reste rejouable pour régénérer/retoucher.
L'icône **maskable** est rendue pleine (pas de coins arrondis, contenu dans la
safe-zone ~80 %) pour le masquage Android adaptatif.

### D6 — `theme_color` vert `#16a34a`

Aligné sur la couleur primaire par défaut de Nuxt UI (gamme `green`) utilisée
dans l'app. Le `background_color` du splash est blanc `#ffffff` (fond clair de
l'app).

## Risques / limites

- **iOS** : Safari ignore une partie du manifest (`theme_color`, install prompt).
  Couvert via les metas `apple-mobile-web-app-*` et `apple-touch-icon`. L'install
  passe par « Sur l'écran d'accueil » (pas de `beforeinstallprompt` sur iOS).
- **Lien manifest client-side** (D4) : non présent dans le HTML brut (curl). Pour
  une SPA c'est attendu et conforme au module ; les audits qui évaluent le DOM
  rendu (Lighthouse) le voient bien.
- **dev** : `devOptions.enabled: false` — pas de SW en `pnpm dev` (évite les
  surprises de cache pendant le HMR). Le SW se teste via `pnpm build && preview`.
