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

Voir `.env.example`.

## Workflow OpenSpec

1. Toute évolution significative passe par un **change OpenSpec** dans `openspec/changes/<slug>/`.
2. Une fois la proposition acceptée, on coche les `tasks.md` au fur et à mesure.
3. Quand le change est terminé, on l'**archive** : ses deltas sont mergés dans `openspec/specs/`.

## Licence

MIT (à confirmer au moment de l'implémentation v1 complète).
