# Meal Manager

Application web de gestion de repas familiaux : inventaire (placard + frigo), recettes, menus hebdomadaires et liste de courses générée automatiquement.

> Statut : change OpenSpec [`init-meal-manager`](./openspec/changes/init-meal-manager/) — sections 1 à 12 implémentées (plateforme, auth, foyers, inventaire, catalogue, menus, liste de courses, front Nuxt UI, Docker). Reste la validation finale (tests, lint, build, parcours manuel) avant archivage du change.

## Stack

- **Node 24** + **pnpm 10** (voir `.nvmrc` et `package.json#packageManager`)
- **Nuxt 4** (front + back via Nitro) + **Vue 3** + **Pinia**
- **Nuxt UI**
- **Drizzle ORM** + **MariaDB** (driver `mysql2`)
- **Zod** pour les DTO et la validation
- **nuxt-auth-utils** pour les sessions
- **@node-rs/argon2** pour le hash des mots de passe
- **Vitest** pour les tests
- **ESLint** + **Prettier** (config officielle Nuxt)

## Prérequis

- Node 24 (`nvm install` lit `.nvmrc`)
- pnpm 10 (`corepack enable` puis `corepack prepare pnpm@10 --activate`)
- MariaDB 10.6+ (ou compatible MySQL 8) accessible localement

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

## Lancer en dev

```bash
pnpm dev   # http://localhost:3000
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
| `pnpm test`        | Lance Vitest                                                 |
| `pnpm lint`        | ESLint (incluant la règle d'isolation du domaine)            |
| `pnpm format`      | Prettier sur l'ensemble du repo                              |
| `pnpm typecheck`   | Vérification stricte TypeScript via `nuxt typecheck`         |
| `pnpm db:generate` | Génère une migration depuis les schémas Drizzle              |
| `pnpm db:migrate`  | Applique les migrations à la base configurée                 |
| `pnpm db:studio`   | Ouvre Drizzle Studio                                         |

## Arborescence

```
meal-manager/
├── app/                     # Code client (Vue/Nuxt)
├── server/
│   ├── api/                 # Adapters HTTP (routes Nitro) — à venir
│   ├── contexts/            # Bounded contexts (hexagonal)
│   │   ├── platform/        # Auth, sessions
│   │   ├── family/          # Foyers, membres
│   │   ├── inventory/       # Stocks placard + frigo
│   │   ├── catalog/         # Recettes
│   │   ├── meal-planning/   # Menus hebdomadaires
│   │   └── shopping/        # Listes de courses
│   ├── database/
│   │   ├── client.ts        # Pool mysql2 + Drizzle
│   │   ├── schema/          # Schémas Drizzle par contexte
│   │   └── migrations/      # SQL générés par drizzle-kit
│   ├── plugins/             # Composition root (DI) — à venir
│   ├── middleware/
│   └── utils/
├── shared/                  # Code partagé client/serveur
│   ├── dto/                 # Schémas Zod
│   ├── units/               # Quantity + table de conversions
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   └── ARCHITECTURE.md
└── openspec/                # Spécifications (source de vérité fonctionnelle)
```

Pour les détails d'architecture, voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). Les conventions de commit (Conventional Commits) sont décrites dans [`docs/COMMITS.md`](./docs/COMMITS.md). La source de vérité fonctionnelle vit dans [`openspec/`](./openspec/) (change actif : [`init-meal-manager`](./openspec/changes/init-meal-manager/)).

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | URL MariaDB au format `mysql://user:pass@host:port/db` |
| `NUXT_SESSION_PASSWORD` | oui | Secret de signature des cookies de session (≥ 32 caractères) |
| `NODE_ENV` | non | `development` / `production` |
| `HOST` / `PORT` | non | Bind du serveur Nitro (défaut image Docker : `0.0.0.0:3000`) |
| `MARIADB_USER` / `MARIADB_PASSWORD` / `MARIADB_DATABASE` / `MARIADB_ROOT_PASSWORD` | compose uniquement | Initialisent le service `db` du `docker-compose.yml` |

Voir `.env.example`.

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

### Discoverabilité

Deux fichiers servis statiquement :
- [`/llms.txt`](./public/llms.txt) — sommaire pour découverte LLM.
- [`/llms-full.txt`](./public/llms-full.txt) — guide complet (outils, auth, exemples).

### Détails

Voir le change [`add-mcp-llm-integration`](./openspec/changes/add-mcp-llm-integration/) (proposal, design, tasks) pour le rationale technique (transport stateless, hash SHA-256 plutôt qu'argon2id, futur OAuth 2.1).

## Workflow OpenSpec

1. Toute évolution significative passe par un **change OpenSpec** dans `openspec/changes/<slug>/`.
2. Une fois la proposition acceptée, on coche les `tasks.md` au fur et à mesure.
3. Quand le change est terminé, on l'**archive** : ses deltas sont mergés dans `openspec/specs/`.

## Licence

MIT (à confirmer au moment de l'implémentation v1 complète).
