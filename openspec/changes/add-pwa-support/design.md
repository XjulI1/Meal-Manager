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

### D5 — Icônes : asset fourni plutôt que génération au build

Le jeu d'icônes (assiette + cœur sur dégradé vert) est un **asset de design
fourni**, commité dans `public/` ; pas de génération au build (l'env n'a de toute
façon ni `sharp`, ni ImageMagick, ni `rsvg`). Le master vectoriel
`public/icon-master.svg` (identique à `favicon.svg`) est conservé pour régénérer
les déclinaisons. L'icône **maskable** réutilise le rendu plein 512×512
(`ic_launcher_playstore` du jeu fourni) : le contenu (assiette) tient dans la
safe-zone, OK pour le masquage Android adaptatif.

### D6 — `theme_color` vert `#28a24b`

Repris du stop médian du dégradé de l'icône fournie (`#5BC46A → #28A24B →
#127A38`), pour que la barre de statut / splash s'accordent à la marque. Le
`background_color` du splash est blanc `#ffffff` (fond clair de l'app).

## Risques / limites

- **iOS** : Safari ignore une partie du manifest (`theme_color`, install prompt).
  Couvert via les metas `apple-mobile-web-app-*` et `apple-touch-icon`. L'install
  passe par « Sur l'écran d'accueil » (pas de `beforeinstallprompt` sur iOS).
- **Lien manifest client-side** (D4) : non présent dans le HTML brut (curl). Pour
  une SPA c'est attendu et conforme au module ; les audits qui évaluent le DOM
  rendu (Lighthouse) le voient bien.
- **dev** : `devOptions.enabled: false` — pas de SW en `pnpm dev` (évite les
  surprises de cache pendant le HMR). Le SW se teste via `pnpm build && preview`.
