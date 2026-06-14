# Proposal: Progressive Web App (installable + app shell)

## Why

Meal Manager est une application **familiale** consultée majoritairement depuis un
téléphone, debout dans la cuisine (vérifier l'inventaire, cocher la liste de
courses, lire une recette). Aujourd'hui c'est un site web ouvert dans un onglet :

- Pas d'icône sur l'écran d'accueil — il faut retrouver l'URL et naviguer dans le
  navigateur à chaque usage.
- Pas d'affichage plein écran (`standalone`) — la barre d'URL et les onglets
  mangent l'espace utile sur petit écran.
- Pas de mise en cache du *shell* applicatif — chaque ouverture re-télécharge le
  JS/CSS, lent sur une connexion cuisine médiocre.

L'application est déjà une **SPA** (`ssr: false`), ce qui rend l'ajout PWA
naturel et peu risqué : un manifest, un service worker de précache et un jeu
d'icônes suffisent à la rendre **installable**.

## What Changes

### 1. Module `@vite-pwa/nuxt`

Ajout du module officiel (Vite PWA / Workbox) dans `nuxt.config.ts`, configuré
en `registerType: 'autoUpdate'`. Le service worker précache le shell (JS, CSS,
HTML, icônes, polices) et utilise `navigateFallback: '/'` pour servir la SPA hors
réseau au niveau navigation.

### 2. Web App Manifest

Manifest généré : `name`, `short_name`, `description`, `lang: fr-FR`,
`display: standalone`, `theme_color: #28a24b`, `background_color: #ffffff`,
`start_url: /`, `scope: /`, et le jeu d'icônes (192/512 + maskable 512).

### 3. Jeu d'icônes + favicon

Jeu d'icônes fourni (asset géré) : assiette + cœur sur dégradé vert. Décliné en
`pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`,
`apple-touch-icon-180x180.png`, `favicon.svg`, `favicon.ico`, `favicon-16.png`,
`favicon-32.png`. Master vectoriel conservé : `public/icon-master.svg`.

### 4. Meta head + injection du manifest

Ajout dans `app.head` des metas `theme-color` (`#28a24b`), `description`, des
liens favicon (`.ico`, `.svg`, 16/32) et des metas/lien Apple
(`apple-touch-icon`, `apple-mobile-web-app-*`). Le lien
`<link rel="manifest">` est injecté par le composant `<VitePwaManifest />` monté
dans `app.vue` : en SPA le module retire tout lien manifest statique du head pour
le gérer lui-même (évite les doublons).

### 5. Affordances d'installation et de mise à jour

Composant `PwaPrompt.vue` (piloté par `$pwa`) : invite discrète « Installer
Meal Manager » quand `beforeinstallprompt` est disponible, et notification
« Mise à jour disponible → Recharger » quand un nouveau service worker est prêt
(rechargement déclenché par l'utilisateur, pour ne pas interrompre une saisie).

**Stratégie hors-ligne (explicite) :** seul le *shell* est mis en cache. Les
appels `/api/*`, `/mcp` et `/.well-known/*` restent **network-only** (données par
foyer, jamais servies périmées). L'offline complet reste **hors scope v1**
(cohérent avec `openspec/project.md` → « Hors ligne : Non pris en charge en v1 »).
La PWA apporte l'**installabilité** et le chargement rapide du shell, pas le
fonctionnement déconnecté.

**Hors scope v1 :**

- Cache des données métier / synchronisation offline (mutations en file).
- Notifications push / Web Push.
- Partage Web Share Target, raccourcis (`shortcuts`), screenshots du manifest.
- Badging API, periodic background sync.

## Capabilities

### Added Capabilities

- `pwa` : l'application est installable (manifest + icônes) et son shell est
  servi par un service worker, sans introduire de fonctionnement hors-ligne des
  données.

## Impact

**Code créé :**
- Icônes `public/` : `pwa-192x192.png`, `pwa-512x512.png`,
  `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.svg`,
  `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `icon-master.svg`.
- `app/components/PwaPrompt.vue`.
- `tests/integration/http/pwa-assets.test.ts`.

**Code modifié :**
- `nuxt.config.ts` : module `@vite-pwa/nuxt`, bloc `pwa`, `app.head`.
- `app/app.vue` : `<VitePwaManifest />` + `<PwaPrompt />`.
- `.gitignore` : `dev-dist/`.
- `README.md`, `docs/COMMITS.md` (scope `pwa`).

**DB :** aucun changement.
**API :** aucune route métier modifiée. Endpoints statiques ajoutés au build :
`/manifest.webmanifest`, `/sw.js`, `/workbox-*.js`, icônes.
**Dépendances npm :** `+@vite-pwa/nuxt` (devDependency).
**Tests :** 1 nouveau fichier d'intégration.
