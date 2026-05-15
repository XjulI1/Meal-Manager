# Architecture

Document de référence pour le code. Pour le « pourquoi » fonctionnel, voir [`openspec/project.md`](../openspec/project.md) et le change `init-meal-manager`.

## Principe : hexagonal par bounded context

Chaque **bounded context** (`platform`, `family`, `inventory`, `catalog`, `meal-planning`, `shopping`) vit dans `server/contexts/<context>/` et expose trois couches :

```
server/contexts/<context>/
├── domain/                  # Entités, value objects, ports, erreurs métier
│   ├── entities/
│   ├── value-objects/
│   ├── ports/               # Interfaces (IXxxRepository, IBarcodeResolver, …)
│   └── errors/
├── application/
│   └── use-cases/           # Orchestration ; dépend du domaine seulement
└── infrastructure/
    ├── repositories/        # Adapters Drizzle
    └── mappers/             # Row Drizzle ↔ entité de domaine
```

### Règle de dépendance

```
infrastructure  →  application  →  domain
                                   (aucune dépendance sortante)
```

**Le domaine n'importe rien d'externe.** Pas de `drizzle-orm`, `mysql2`, `h3`, `nuxt`, `vue`, `@nuxt/*`, ni `~/server/database/*`. Cette règle est **enforced par ESLint** (`eslint.config.mjs` — `no-restricted-imports` ciblant `server/contexts/*/domain/**`).

Vérifiable :

```bash
# Ajoute temporairement un import drizzle dans un fichier de domain, puis :
pnpm lint   # doit échouer
```

### Pourquoi cette structure

- **Évolution indépendante** : ajouter du scan de code-barres ne touche pas `catalog`.
- **Testabilité** : les use cases sont testables avec des fakes en mémoire — aucun setup Nuxt/Drizzle requis.
- **Extensions futures préparées** : les ports `IBarcodeResolver`, `IRecipeImporter`, `IMenuSuggester`, `IRecipeGenerator`, `IExpirationTracker` seront déclarés dans le domaine dès leur contexte respectif, même sans adapter v1.

## Composition root

La composition (DI) vit dans `server/plugins/container.ts` (à venir). Aucune route HTTP ne doit instancier directement un use case ou un repository — toutes récupèrent leurs dépendances via `event.context.container.<useCase>`.

## Quantités et unités

Toutes les quantités traversent le Value Object `Quantity` (`shared/units/quantity.ts`) :

- Stockage interne : **toujours en unité canonique** (`g`, `ml`, `unit`), entier non négatif.
- Conversion à la frontière via `Quantity.fromUserInput(value, unitSymbol)` (parsing DTO entrants) et `quantity.toDisplay(targetUnit?)` (rendu UI).
- Combiner deux quantités de dimensions différentes (`mass` vs `volume`) lève `IncompatibleUnitsError`.

Conversions reconnues : `mg`, `g`, `kg` (masse) ; `ml`, `cl`, `dl`, `l` (volume) ; `unit`, `pc`, `piece` (discret).

## Base de données

- **MariaDB** (driver `mysql2`).
- Schémas Drizzle dans `server/database/schema/*.ts`, un fichier par agrégat racine.
- Migrations versionnées dans `server/database/migrations/` (générées par `pnpm db:generate`, appliquées par `pnpm db:migrate`).
- Le **pool de connexions** est créé une fois (`server/database/client.ts`) ; les repositories reçoivent l'instance Drizzle, jamais le pool brut.

### Mapping ID

Tous les IDs sont des **UUID stockés en `char(36)`** (compatibilité MariaDB, lisibilité). Génération côté application (pas de défaut SQL pour rester portable).

### Quantités en base

Les colonnes `quantity_value` (`int unsigned`) + `quantity_unit` (`enum('g','ml','unit')`) reflètent strictement la convention canonique. Les mappers convertissent en `Quantity` à l'entrée du domaine.

## DTO partagés

Tous les DTO Zod vivent dans `shared/dto/`. Ils sont consommés à la fois par :

- les routes HTTP côté serveur (validation entrante via `safeParse`),
- les composables / formulaires côté client (typage et validation locale).

Conséquence : pas de duplication front/back ; les types frontaux dérivent toujours du schéma.

## Tests

| Niveau         | Outil  | Cible                                                             |
|----------------|--------|-------------------------------------------------------------------|
| **Unit**       | Vitest | Value Objects (`Quantity`, …), services purs                      |
| **Integration**| Vitest | Use cases avec repositories **en mémoire** (fakes)                |
| **E2E**        | Playwright (optionnel) | Parcours UI complet                               |

Les repositories Drizzle ne sont pas testés en v1 (acceptable pour la taille du projet). Pourra être ajouté plus tard via testcontainers MariaDB.

## Conventions

- TypeScript strict (`strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`).
- ESLint config officielle Nuxt + règle d'isolation du domaine.
- Prettier (config dans `.prettierrc`).
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Une PR = un change OpenSpec ou un sous-ensemble cohérent de tasks.
