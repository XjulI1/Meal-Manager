# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble

Meal Manager : application Nuxt 4 (front + back via Nitro) pour gérer l'inventaire (placard + frigo), les recettes, les menus hebdomadaires et la liste de courses d'une famille. Stack : **Nuxt 4 + Vue 3 + Pinia + Nuxt UI + Drizzle ORM + MariaDB + Zod + nuxt-auth-utils + Vitest + Docker**. Node 24, pnpm 10.

Le projet suit un workflow **spec-driven via OpenSpec** (`@fission-ai/openspec`). Les specs sous `openspec/` sont la source de vérité fonctionnelle ; un *change* en cours vit dans `openspec/changes/<slug>/` avec `proposal.md`, `design.md`, `tasks.md` et des delta specs. Une fois archivé, les deltas mergent dans `openspec/specs/`.

## Commandes courantes

```bash
pnpm dev                  # Nuxt en dev (HMR) — http://localhost:3000
pnpm build                # build production (.output/)
pnpm preview              # sert le build local

pnpm test                 # Vitest run (unit + integration)
pnpm test:watch           # Vitest watch
pnpm vitest run path/to/file.test.ts   # un seul fichier
pnpm vitest run -t "regex"             # filtre par nom de test

pnpm lint                 # ESLint (inclut la règle d'isolation domain — voir plus bas)
pnpm lint:fix             # ESLint --fix
pnpm format               # Prettier
pnpm typecheck            # nuxt typecheck (strict)

pnpm db:generate          # génère une migration depuis les schémas Drizzle
pnpm db:migrate           # applique les migrations
pnpm db:studio            # Drizzle Studio

# Docker
docker compose up --build # stack complète (MariaDB 11.4 + app) sur :3000
docker build -t meal-manager .

# OpenSpec
npx -y -p @fission-ai/openspec@latest openspec validate --all
npx -y -p @fission-ai/openspec@latest openspec list
# Slash commands (Claude Code) : /opsx:propose, /opsx:apply, /opsx:archive, /opsx:explore
```

`pnpm test` n'a pas besoin d'une base MariaDB : les tests d'intégration utilisent des fakes en mémoire. Seules les commandes `db:*` et `pnpm dev` exigent `DATABASE_URL`.

## Architecture : hexagonale par bounded context

Six bounded contexts vivent côte à côte sous `server/contexts/<context>/`, chacun découpé en trois couches :

```
server/contexts/<context>/
├── domain/                  # entités, value objects, ports (interfaces), erreurs métier
│   ├── entities/
│   ├── value-objects/
│   ├── ports/               # IXxxRepository, IBarcodeResolver, …
│   └── errors/
├── application/use-cases/   # orchestre le domaine via les ports
└── infrastructure/
    ├── repositories/        # adapters Drizzle
    └── mappers/             # row Drizzle ↔ entité de domaine
```

Contextes : `platform` (auth, sessions), `family` (foyers, membres, invitations), `inventory` (stocks placard + frigo), `catalog` (recettes), `meal-planning` (menus hebdomadaires), `shopping` (listes de courses dérivées).

**Règle de dépendance : `infrastructure → application → domain`.** Le domaine n'importe **rien** d'externe — pas de `drizzle-orm`, `mysql2`, `h3`, `nuxt`, `vue`, ni `~/server/database/*`. Cette règle est *enforced* par ESLint (`eslint.config.mjs`, pattern `server/contexts/*/domain/**`). Quand le domaine a besoin d'I/O, déclare un **port** (interface) dans `domain/ports/` et fournis l'implémentation dans `infrastructure/`.

### Composition root (DI)

`server/plugins/container.ts` instancie tous les repositories et use cases au démarrage de Nitro, puis les expose sur `event.context.container`. **Les routes HTTP n'instancient jamais directement un use case ou un repository** — elles font `const useCase = event.context.container.someUseCase` puis appellent `useCase.execute(...)`.

### Isolation foyer

Toutes les routes scoped-foyer doivent passer par le helper `requireHouseholdMember()` (dans `server/utils/`). Il hydrate le `householdId` à partir de la session et l'injecte dans le use case. Aucun use case ne doit retourner des données sans `householdId` explicite.

### Unités canoniques

Toutes les quantités traversent le Value Object `Quantity` (`shared/units/quantity.ts`). Stockage interne **toujours** en unité canonique :

| Dimension | Unité canonique | Stockage DB |
|---|---|---|
| Masse | `g` | `int unsigned` |
| Volume | `ml` | `int unsigned` |
| Pièce | `unit` | `int unsigned` |

Conversions (kg↔g, L↔ml, cl↔ml, mg↔g) à la frontière via `Quantity.fromUserInput(...)` / `quantity.toDisplay(...)`. Les colonnes Drizzle utilisent `mysqlEnum('quantity_unit', ['g','ml','unit'])` — pas d'autre unité en base. Combiner deux quantités de dimensions différentes lève `IncompatibleUnitsError`.

### Liste de courses dérivée

`ShoppingList = Σ(ingrédients du menu × portions) − Inventory courant`. La liste est calculée par `GenerateShoppingListUseCase` (contexte `shopping`) puis persistée comme **snapshot** cochable. Le snapshot n'est jamais la source de vérité — on peut le régénérer depuis le menu. `ShoppingListBuilder` agrège par `(name trim/lowercase, unité canonique)` et drop les entrées ≤ 0 après soustraction.

### Ports d'extension future (déclarés, non implémentés en v1)

`IBarcodeResolver` (inventory), `IRecipeImporter` / `IRecipeGenerator` (catalog), `IMenuSuggester` (meal-planning). Ces interfaces existent dans le `domain/` du bon contexte pour que les évolutions (scan code-barres, IA) n'imposent pas de refactor du domaine.

## DTO et code partagé

`shared/dto/*.ts` contient les schémas Zod, consommés à la fois côté serveur (`safeParse` à la frontière HTTP) et côté client (typage des composables `useApi*`). Pas de duplication front/back.

`shared/units/` contient `Quantity` et la table de conversions.

## Base de données

- Schémas Drizzle dans `server/database/schema/*.ts` (un fichier par agrégat racine).
- Pool `mysql2` créé une fois dans `server/database/client.ts` ; les repositories reçoivent l'instance Drizzle, jamais le pool brut.
- IDs en `char(36)` (UUID générés côté application — pas de défaut SQL pour rester portable).
- Migrations versionnées dans `server/database/migrations/` (générées par `pnpm db:generate`).

## Front

- `app/pages/` : `/login`, `/register`, `/inventory`, `/recipes`, `/recipes/[id]`, `/menu`, `/shopping`, page d'onboarding foyer.
- Stores Pinia : **UI state uniquement**, jamais de logique métier.
- Composables `useApi*` typés via les DTO de `shared/dto/`.
- Middleware client `auth.ts` redirige vers `/login` si pas de session.

## Tests

| Niveau | Cible |
|---|---|
| `tests/unit/` | Value Objects (`Quantity`, `WeekStart`, `InviteCode`, …), services purs |
| `tests/integration/` | Use cases avec repositories **en mémoire** + smoke tests HTTP |

Pas de tests Drizzle réels en v1 (acceptable pour la taille du projet ; pourra venir via testcontainers MariaDB plus tard). Pas de Playwright en v1.

`tests/integration/http/nuxt-runtime-stubs.ts` est chargé comme `setupFiles` dans `vitest.config.ts` — c'est ce qui permet aux smoke HTTP de tourner sans Nuxt complet.

## Conventions

- TypeScript strict (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`).
- Conventional Commits — détails et scopes (`platform`, `family`, `inventory`, `catalog`, `meal-planning`, `shopping`, `deploy`, `db`, `ui`, `shared`, `docs`) dans [`docs/COMMITS.md`](./docs/COMMITS.md). Référence le tasks.md d'un change en footer : `Refs: <change-slug> §<n.m>`.
- Une PR = un change OpenSpec ou un sous-ensemble cohérent de tasks.
- Locale `fr-FR` (français uniquement en v1).
- Auth : argon2id, paramètres OWASP 2024 (m=19456 KiB, t=2, p=1). `LoginUserUseCase` doit utiliser un dummy hash quand l'email est inconnu (neutralisation du timing attack) — ne pas l'enlever.
- `InviteCode` : 8 caractères, alphabet sans `O/0/1/I`.

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:port/db` |
| `NUXT_SESSION_PASSWORD` | secret cookies de session (≥ 32 caractères) |
| `HOST` / `PORT` | bind Nitro (défaut Docker : `0.0.0.0:3000`) |

Voir `.env.example` pour la liste complète (incluant les vars `MARIADB_*` consommées par `docker-compose.yml`).

## Documentation de référence

- [`README.md`](./README.md) : installation, scripts, arborescence.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) : détails de l'architecture hexagonale.
- [`docs/COMMITS.md`](./docs/COMMITS.md) : conventions de commit.
- [`openspec/project.md`](./openspec/project.md) : vision, contraintes, choix structurants.
- [`openspec/changes/init-meal-manager/`](./openspec/changes/init-meal-manager/) : change initial (fondations), `tasks.md` à jour.
