# Meal Manager

Application web de gestion de repas familiaux : inventaire (placard + frigo), catalogue d'ingrédients et de recettes, menus hebdomadaires et liste de courses générée automatiquement.

> Statut : fondations livrées et tous les changes OpenSpec à ce jour sont archivés (voir [`openspec/changes/archive/`](./openspec/changes/archive/)). Fonctionnalités en place : plateforme + auth, foyers, inventaire placard/frigo, catalogue d'ingrédients & produits avec **scan code-barre**, recettes, menus hebdomadaires, liste de courses dérivée, front Nuxt UI, **assistant recettes IA (Claude)**, **intégration LLM via MCP**, et **discoverabilité agent-ready**.

## Stack

- **Node 24** + **pnpm 10** (voir `.nvmrc` et `package.json#packageManager`)
- **Nuxt 4** (front + back via Nitro) + **Vue 3** + **Pinia**
- **Nuxt UI 4**
- **Drizzle ORM** + **MariaDB 11.4** (driver `mysql2`)
- **Zod** pour les DTO et la validation
- **nuxt-auth-utils** pour les sessions + **Personal Access Tokens** (auth des agents)
- **@node-rs/argon2** pour le hash des mots de passe
- **@anthropic-ai/sdk** pour l'assistant recettes IA (Claude)
- **@modelcontextprotocol/sdk** pour l'endpoint MCP (`/mcp`)
- **@zxing/browser** + `BarcodeDetector` pour le scan code-barre
- **Vitest** pour les tests
- **ESLint** (+ `eslint-plugin-boundaries` pour l'isolation du domaine) + **Prettier**

## Prérequis

- Node 24 (`nvm install` lit `.nvmrc`)
- pnpm 10 (`corepack enable` puis `corepack prepare pnpm@10 --activate`)
- MariaDB 11.4 (la stack Docker l'embarque ; en local, 10.6+ ou un MySQL 8 compatible suffit)

## Installation

```bash
nvm use                            # active Node 24 via .nvmrc
corepack enable                    # active pnpm pinné par packageManager
pnpm install
cp .env.example .env               # remplir DATABASE_URL et NUXT_SESSION_PASSWORD
```

### Base de données locale

```sql
-- Connecté à MariaDB en root :
CREATE DATABASE meal_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'meal'@'%' IDENTIFIED BY 'meal';
GRANT ALL PRIVILEGES ON meal_manager.* TO 'meal'@'%';
FLUSH PRIVILEGES;
```

Puis renseigner `DATABASE_URL="mysql://meal:meal@localhost:3306/meal_manager"` dans `.env`.

### Appliquer le schéma

```bash
pnpm db:generate   # (re)génère une migration depuis les schémas Drizzle
pnpm db:migrate    # applique les migrations
```

Les migrations `0000` → `0005` couvrent les fondations, le catalogue d'ingrédients, le stockage congélateur, les Personal Access Tokens, la contrainte d'unicité d'inventaire et le flag `users.ai_enabled`.

#### Migration `0004_add_inventory_items_unique_constraint`

Cette migration ajoute une contrainte d'unicité sur `inventory_items (household_id, ingredient_id, location)` afin de garantir qu'**une ligne d'inventaire = un couple (ingrédient, emplacement)** (cf. sémantique upsert de `POST /api/inventory`). Si une base de dev contient déjà des doublons sur ce triplet, la migration échouera avec `ER_DUP_ENTRY`. Solution : repartir d'une base propre via `pnpm db:migrate` après reset, ou en environnement Docker :

```bash
docker compose down -v   # purge le volume MariaDB
docker compose up --build
```

### Scan caméra (permissions navigateur)

Les flows de scan code-barre (`/inventory` → "Scanner pour ranger / consommer", `/ingredients` → "Scanner un nouveau produit") utilisent l'API `BarcodeDetector` (Chrome Android) avec fallback `@zxing/browser` (Safari iOS, desktop). L'accès caméra exige un **contexte sécurisé** :

- En dev : `http://localhost:3000` est accepté par les navigateurs.
- En production : **HTTPS obligatoire**. Sans HTTPS, la modal de scan affiche un message « HTTPS requis » et la caméra ne démarre pas.

## Lancer en dev

```bash
pnpm dev   # http://localhost:3000
```

## PWA (application installable)

Meal Manager est une **Progressive Web App** (module `@vite-pwa/nuxt`) :
installable sur mobile/desktop (icône d'écran d'accueil, affichage `standalone`)
avec un service worker qui précache le *shell* applicatif (JS/CSS/HTML/icônes).

- **Manifest** : `/manifest.webmanifest` (généré au build). Thème vert `#16a34a`.
- **Service worker** : `registerType: 'autoUpdate'`. Une notification « Mise à jour
  disponible » invite l'utilisateur à recharger (pas de reload silencieux).
- **Hors-ligne** : **shell uniquement**. Les appels `/api/*`, `/mcp` et
  `/.well-known/*` restent _network-only_ (données par foyer jamais servies
  périmées). Le fonctionnement déconnecté des données est hors scope v1.
- **Dev** : le SW est désactivé en `pnpm dev` (`devOptions.enabled: false`).
  Pour le tester : `pnpm build && pnpm preview`, puis DevTools → Application.

### Régénérer les icônes

Les icônes (`public/pwa-*.png`, `maskable-icon-512x512.png`,
`apple-touch-icon-180x180.png`) sont produites sans dépendance externe :

```bash
node scripts/generate-pwa-icons.mjs
```

## Lancer via Docker

L'image embarque le bundle Nitro standalone (`.output/`) + l'outillage Drizzle.
L'entrypoint applique les migrations puis démarre le serveur.

### Stack complète (app + MariaDB) via Compose

```bash
cp .env.example .env       # remplir NUXT_SESSION_PASSWORD (≥ 32 caractères)
docker compose up --build  # http://localhost:3000
```

Le service `db` (MariaDB 11.4) expose le port `3306` et est partagé entre `pnpm dev`
sur l'hôte (via `DATABASE_URL=...@localhost:3306/...`) et le service `app` du compose
(via `DATABASE_URL=...@db:3306/...`). `docker compose down -v` purge le volume MariaDB.

### Image seule

```bash
docker build -t meal-manager .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="mysql://meal:meal@host.docker.internal:3306/meal_manager" \
  -e NUXT_SESSION_PASSWORD="$(openssl rand -base64 48)" \
  meal-manager
```

### Builder distant (Synology / registry privée)

`deploy/` contient un compose autonome qui clone une branche GitHub, build
l'image et la pousse dans une registry, sans nécessiter de checkout préalable
sur la machine hôte (utile depuis un NAS) :

```bash
cd deploy
docker compose run --rm builder                                    # main → localhost:5050/meal-planning:latest
GIT_BRANCH=feat/something docker compose run --rm builder          # branche custom
REGISTRY=dockregistry.xju.fr/meal-planning IMAGE_TAG=v0.2.0 \
  docker compose run --rm builder                                  # registry + tag explicites
```

## Scripts utiles

| Script             | Effet                                                        |
|--------------------|--------------------------------------------------------------|
| `pnpm dev`         | Démarre Nuxt en mode développement (HMR)                     |
| `pnpm build`       | Build production (`.output/`)                                |
| `pnpm preview`     | Sert le build production en local                            |
| `pnpm test`        | Lance Vitest (run unique)                                    |
| `pnpm test:watch`  | Vitest en mode watch                                         |
| `pnpm lint`        | ESLint (incluant la règle d'isolation du domaine)            |
| `pnpm lint:fix`    | ESLint avec correction automatique                           |
| `pnpm format`      | Prettier sur l'ensemble du repo                              |
| `pnpm typecheck`   | Vérification stricte TypeScript via `nuxt typecheck`         |
| `pnpm db:generate` | Génère une migration depuis les schémas Drizzle              |
| `pnpm db:migrate`  | Applique les migrations à la base configurée                 |
| `pnpm db:studio`   | Ouvre Drizzle Studio                                         |
| `pnpm docker:up`   | Raccourci pour `docker compose up --build`                   |

## Arborescence

```
meal-manager/
├── app/                     # Code client (Vue/Nuxt) — pages, composants, stores, composables
├── server/
│   ├── api/                 # Adapters HTTP (routes Nitro)
│   ├── routes/
│   │   ├── mcp/             # Transport Model Context Protocol (/mcp) + tools mealmanager_*
│   │   └── .well-known/     # Catalogue d'API (RFC 9727)
│   ├── contexts/            # Bounded contexts (hexagonal)
│   │   ├── platform/        # Auth, sessions, Personal Access Tokens
│   │   ├── family/          # Foyers, membres, invitations
│   │   ├── inventory/       # Stocks placard + frigo
│   │   ├── ingredients/     # Catalogue d'ingrédients & produits (codes-barres)
│   │   ├── catalog/         # Recettes (+ assistant IA, import URL)
│   │   ├── meal-planning/   # Menus hebdomadaires
│   │   └── shopping/        # Listes de courses dérivées
│   ├── database/
│   │   ├── client.ts        # Pool mysql2 + Drizzle
│   │   ├── schema/          # Schémas Drizzle par agrégat racine
│   │   └── migrations/      # SQL générés par drizzle-kit
│   ├── plugins/             # Composition root (DI) — container.ts
│   ├── middleware/
│   └── utils/               # requireHouseholdMember / requireHouseholdFromPAT
├── shared/                  # Code partagé client/serveur
│   ├── dto/                 # Schémas Zod
│   ├── units/               # Quantity + table de conversions
│   └── types/
├── public/                  # robots.txt, llms.txt, llms-full.txt, openapi-mcp.yaml
├── tests/
│   ├── unit/                # Value Objects, services purs
│   └── integration/         # Use cases (repos en mémoire) + smoke HTTP
├── docs/
│   ├── ARCHITECTURE.md
│   └── COMMITS.md
└── openspec/                # Spécifications (source de vérité fonctionnelle)
```

Pour les détails d'architecture, voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). Les conventions de commit (Conventional Commits) sont décrites dans [`docs/COMMITS.md`](./docs/COMMITS.md). La source de vérité fonctionnelle vit dans [`openspec/`](./openspec/) : les specs courantes sous [`openspec/specs/`](./openspec/specs/), l'historique des changes sous [`openspec/changes/archive/`](./openspec/changes/archive/).

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | URL MariaDB au format `mysql://user:pass@host:port/db` |
| `NUXT_SESSION_PASSWORD` | oui | Secret de signature des cookies de session (≥ 32 caractères) |
| `NUXT_ANTHROPIC_API_KEY` | non | Clé serveur de l'API Claude pour l'assistant recettes IA (lue via `runtimeConfig`, préfixe `NUXT_` requis). Vide ⇒ IA inactive. Jamais exposée au client. |
| `NUXT_ANTHROPIC_MODEL` | non | Modèle Claude utilisé (défaut `claude-sonnet-4-6`). |
| `NUXT_ANTHROPIC_CHAT_EFFORT` | non | Effort du chat : `low`/`medium`/`high`/`max` (défaut `medium`). |
| `NUXT_ANTHROPIC_IMPORT_EFFORT` | non | Effort de l'extraction d'import (défaut `low`). |
| `NODE_ENV` | non | `development` / `production` |
| `HOST` / `PORT` | non | Bind du serveur Nitro (défaut image Docker : `0.0.0.0:3000`) |
| `MARIADB_USER` / `MARIADB_PASSWORD` / `MARIADB_DATABASE` / `MARIADB_ROOT_PASSWORD` | compose uniquement | Initialisent le service `db` du `docker-compose.yml` |

Voir `.env.example`.

## Assistant recettes (IA)

Un assistant conversationnel (Claude) aide à trouver, co-construire ou importer une recette, puis pré-remplit le formulaire de création (`/recipes/chat`). Recherche web intégrée + import depuis une URL (JSON-LD, repli extraction Claude).

- Nécessite `NUXT_ANTHROPIC_API_KEY` côté serveur.
- **Désactivé par défaut, par compte** : la colonne `users.ai_enabled` vaut `false` à la création. Tant qu'elle n'est pas activée, les routes IA renvoient `403` et aucun appel à l'API n'est fait (pas de consommation subie).
- **Activer un compte** (paramètre administrateur en v1) via `pnpm db:studio`, ou en SQL :

```sql
UPDATE users SET ai_enabled = 1 WHERE email = 'utilisateur@example.com';
```

L'utilisateur retrouve alors l'entrée « Assistant IA » dans Recettes.

## Intégration LLM (MCP)

Meal Manager expose un endpoint **Model Context Protocol** sur `POST /mcp` (avec `GET`/`DELETE` pour le transport StreamableHTTP) qui permet à un client LLM (Claude Desktop, Cursor, Home Assistant, scripts Gemini) d'interroger un foyer en **lecture seule**.

### Obtenir un token

1. Se connecter au front, ouvrir le menu utilisateur → **Paramètres**.
2. **Nouveau token** → donner un nom (« Claude Desktop », « Home Assistant »…).
3. Le plaintext `mm_pat_…` est affiché **une seule fois**. Le copier maintenant — il ne sera plus jamais ré-affiché. Seul son hash SHA-256 est persisté.
4. Un token est lié au foyer courant de l'utilisateur ; révocable à tout moment.

### Outils disponibles (v1, lecture seule)

Huit tools préfixés `mealmanager_` : `list_inventory`, `list_recipes`, `get_recipe`, `get_menu_for_week`, `get_shopping_list`, `list_ingredients`, `get_ingredient`, `get_household`. Aucun n'accepte de `householdId` en input — il est dérivé du token.

### Exemple : Claude Desktop

```json
{
  "mcpServers": {
    "meal-manager": {
      "type": "http",
      "url": "https://your-domain.example/mcp",
      "headers": {
        "Authorization": "Bearer mm_pat_xxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Tester à la main avec curl

Le transport StreamableHTTP exige que le client envoie un `Accept` qui inclut **les deux** types `application/json` ET `text/event-stream` (sinon 406 « Not Acceptable »). Les vrais clients MCP le font automatiquement ; en curl :

```bash
# Lister les outils
curl -X POST https://your-domain.example/mcp \
  -H "Authorization: Bearer mm_pat_xxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Appeler un outil
curl -X POST https://your-domain.example/mcp \
  -H "Authorization: Bearer mm_pat_xxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"mealmanager_list_inventory","arguments":{}}}'
```

### Voix sur Google Home / Nest

Aujourd'hui (mai 2026) un Nest ne peut pas appeler directement un serveur MCP tiers. Le chemin pragmatique pour la voix : **Home Assistant comme bridge** — HA supporte les serveurs MCP en client et expose ses entités à Google Assistant via l'intégration officielle.

### Discoverabilité (« agent-ready »)

Quatre ressources publiques laissent un agent ou un scanner découvrir Meal Manager sans configuration préalable :

| Endpoint | Rôle | Format |
|---|---|---|
| [`/robots.txt`](./public/robots.txt) | Bot Access Control — disallow `/` pour tous les crawlers IA (GPTBot, ClaudeBot, PerplexityBot, etc.) **et** wildcard. Cohérent avec une app privée — le seul canal agent est `/mcp` avec PAT. | `text/plain` |
| `/.well-known/api-catalog` | Catalogue RFC 9727 — annonce l'endpoint `/mcp` et pointe vers sa description OpenAPI. | `application/linkset+json` |
| [`/openapi-mcp.yaml`](./public/openapi-mcp.yaml) | OpenAPI 3.1 du `/mcp` — `securityScheme bearerAuth` + les 8 tools `mealmanager_*` documentés sous l'extension `x-mcp-tools`. | `application/yaml` |
| [`/llms.txt`](./public/llms.txt) et [`/llms-full.txt`](./public/llms-full.txt) | Guides en prose pour opérateurs de LLM. | `text/plain` |

De plus, chaque réponse HTTP (sauf `/mcp`) porte un header `Link` (RFC 8288) annonçant ces ressources — un `HEAD /` suffit à découvrir tout.

### Détails

Voir les changes archivés [`add-mcp-llm-integration`](./openspec/changes/archive/2026-05-17-add-mcp-llm-integration/) (transport stateless, hash SHA-256, futur OAuth 2.1) et [`add-agent-discoverability`](./openspec/changes/archive/2026-06-06-add-agent-discoverability/) (RFC 9727, robots.txt, OpenAPI MCP). Le scan code-barre et l'assistant recettes IA sont documentés dans [`add-product-scanning`](./openspec/changes/archive/2026-06-06-add-product-scanning/) et [`add-recipe-chat-assistant`](./openspec/changes/archive/2026-06-06-add-recipe-chat-assistant/).

## Workflow OpenSpec

1. Toute évolution significative passe par un **change OpenSpec** dans `openspec/changes/<slug>/`.
2. Une fois la proposition acceptée, on coche les `tasks.md` au fur et à mesure.
3. Quand le change est terminé, on l'**archive** : ses deltas sont mergés dans `openspec/specs/`.

## Licence

MIT (à confirmer au moment de l'implémentation v1 complète).
