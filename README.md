# Meal Manager

Application web de gestion de repas familiaux : inventaire (placard + frigo), recettes, menus hebdomadaires et liste de courses générée automatiquement.

> Statut : **bootstrap initial** du change OpenSpec `init-meal-manager` — sections 1 à 3 (projet Nuxt 4, schéma BDD, Value Objects partagés). Les contextes métier (`platform`, `family`, `inventory`, `catalog`, `meal-planning`, `shopping`) sont scaffoldés mais leur logique sera implémentée dans des changes ultérieurs.

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

Pour les détails d'architecture, voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) et le change [`openspec/changes/init-meal-manager/`](./openspec/changes/init-meal-manager/).

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | URL MariaDB au format `mysql://user:pass@host:port/db` |
| `NUXT_SESSION_PASSWORD` | oui | Secret de signature des cookies de session (≥ 32 caractères) |
| `NODE_ENV` | non | `development` / `production` |
| `HOST` / `PORT` | non | Bind du serveur Nitro (défaut image Docker : `0.0.0.0:3000`) |
| `MARIADB_USER` / `MARIADB_PASSWORD` / `MARIADB_DATABASE` / `MARIADB_ROOT_PASSWORD` | compose uniquement | Initialisent le service `db` du `docker-compose.yml` |

Voir `.env.example`.

## Workflow OpenSpec

1. Toute évolution significative passe par un **change OpenSpec** dans `openspec/changes/<slug>/`.
2. Une fois la proposition acceptée, on coche les `tasks.md` au fur et à mesure.
3. Quand le change est terminé, on l'**archive** : ses deltas sont mergés dans `openspec/specs/`.

## Licence

MIT (à confirmer au moment de l'implémentation v1 complète).
