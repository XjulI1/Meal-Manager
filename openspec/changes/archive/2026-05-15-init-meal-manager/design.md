# Design: Initialize Meal Manager Application

## Technical Approach

### Vue d'ensemble

Application monolithique modulaire construite sur **Nuxt 4**, suivant une **architecture hexagonale** (ports & adapters) découpée par **bounded contexts**. Le serveur Nitro intégré expose des routes HTTP (`server/api/...`) qui agissent comme adapters entrants (driving adapters), tandis que les repositories Drizzle agissent comme adapters sortants (driven adapters) vers MariaDB.

### Arborescence cible

```
meal-manager/
├── app/                            # Code client (Vue/Nuxt)
│   ├── components/
│   │   ├── inventory/
│   │   ├── recipes/
│   │   ├── menu/
│   │   ├── shopping/
│   │   └── common/
│   ├── composables/                # useInventory, useRecipes…
│   ├── pages/
│   │   ├── index.vue
│   │   ├── login.vue
│   │   ├── register.vue
│   │   ├── inventory/
│   │   ├── recipes/
│   │   ├── menu/
│   │   └── shopping/
│   ├── stores/                     # Pinia (UI state uniquement)
│   ├── middleware/
│   │   └── auth.ts
│   ├── layouts/
│   ├── plugins/
│   ├── error.vue
│   ├── app.vue
│   └── app.config.ts
│
├── server/                         # Code serveur (Nitro)
│   ├── api/                        # Adapters HTTP entrants
│   │   ├── auth/
│   │   │   ├── register.post.ts
│   │   │   ├── login.post.ts
│   │   │   └── logout.post.ts
│   │   ├── households/
│   │   │   ├── index.post.ts
│   │   │   └── join.post.ts
│   │   ├── inventory/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   └── [id].{patch,delete}.ts
│   │   ├── recipes/
│   │   ├── menus/
│   │   └── shopping-lists/
│   ├── contexts/                   # Bounded contexts
│   │   ├── platform/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   ├── family/
│   │   ├── inventory/
│   │   ├── catalog/
│   │   ├── meal-planning/
│   │   └── shopping/
│   ├── database/
│   │   ├── client.ts               # Connexion Drizzle (pool mysql2)
│   │   ├── schema/                 # Schémas Drizzle par contexte
│   │   │   ├── users.ts
│   │   │   ├── households.ts
│   │   │   ├── inventory-items.ts
│   │   │   ├── recipes.ts
│   │   │   ├── menus.ts
│   │   │   └── shopping-lists.ts
│   │   └── migrations/             # Générées par drizzle-kit
│   ├── plugins/
│   │   └── container.ts            # Composition root (DI)
│   ├── middleware/
│   │   └── auth.ts
│   └── utils/
│
├── shared/                         # Code partagé client/serveur
│   ├── dto/                        # DTO + schémas Zod
│   │   ├── auth.ts
│   │   ├── inventory.ts
│   │   ├── recipes.ts
│   │   ├── menus.ts
│   │   └── shopping.ts
│   ├── units/
│   │   ├── quantity.ts             # Value Object Quantity
│   │   └── conversions.ts          # kg↔g, L↔ml, etc.
│   └── types/
│
├── tests/
│   ├── unit/                       # Tests du domaine (pas de Nuxt)
│   ├── integration/                # Tests des use cases avec repo en mémoire
│   └── e2e/                        # Optionnel — Playwright
│
├── drizzle.config.ts
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml              # Pour le dev local
├── .env.example
└── README.md
```

### Structure d'un bounded context

Exemple avec `inventory` :

```
server/contexts/inventory/
├── domain/
│   ├── entities/
│   │   └── inventory-item.ts       # Entité InventoryItem
│   ├── value-objects/
│   │   ├── storage-location.ts     # 'pantry' | 'fridge'
│   │   └── item-id.ts
│   ├── ports/
│   │   ├── inventory-item.repository.ts   # Interface IInventoryItemRepository
│   │   └── barcode-resolver.ts            # Interface IBarcodeResolver (port futur)
│   └── errors/
│       ├── item-not-found.error.ts
│       └── invalid-quantity.error.ts
│
├── application/
│   └── use-cases/
│       ├── add-inventory-item.use-case.ts
│       ├── update-inventory-item.use-case.ts
│       ├── remove-inventory-item.use-case.ts
│       ├── list-inventory-items.use-case.ts
│       └── adjust-quantity.use-case.ts
│
└── infrastructure/
    ├── repositories/
    │   └── drizzle-inventory-item.repository.ts
    └── mappers/
        └── inventory-item.mapper.ts        # Row Drizzle ↔ Entité domaine
```

## Architecture Decisions

### Decision: Nuxt 4 fullstack vs backend séparé

Un seul projet Nuxt 4 expose à la fois le front et le back via Nitro. **Raisons :**

- Une seule image Docker, un seul process à déployer
- Types partagés trivialement via `shared/`
- Pas de duplication de schémas Zod entre front et back
- Hot reload unifié en dev

**Trade-off** : si le backend doit un jour servir d'autres clients (mobile natif), il faudra l'extraire. La séparation par bounded contexts dans `server/contexts/` rend cette extraction possible sans réécriture du domaine.

### Decision: Drizzle ORM vs Prisma

Choix de **Drizzle** pour les raisons suivantes :

- **Pas de client généré** qui pollue les types métier — les schémas Drizzle restent dans l'infrastructure, les entités de domaine sont pures TypeScript
- **SQL-first** : queries explicites, prédictibles, optimisables
- **Bundle minimal** et zéro overhead runtime
- **Bonne intégration MariaDB** via le driver `mysql2`
- **Migrations versionnées** via `drizzle-kit generate`

**Trade-off** : courbe d'apprentissage SQL plus exigeante que Prisma. Acceptable pour ce projet.

### Decision: Pas d'injection de dépendances "lourde"

Pas d'InversifyJS ni de tsyringe. À la place, un **composition root** dans un plugin Nitro (`server/plugins/container.ts`) qui :

1. Instancie les repositories concrets (Drizzle)
2. Instancie les use cases en leur passant les repositories
3. Expose le container via `event.context.container` dans Nitro

```typescript
// server/plugins/container.ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    const itemRepo = new DrizzleInventoryItemRepository(db);
    event.context.container = {
      addInventoryItem: new AddInventoryItemUseCase(itemRepo),
      listInventoryItems: new ListInventoryItemsUseCase(itemRepo),
      // … 
    };
  });
});
```

**Raisons** : suffisant pour un projet de cette taille, zéro dépendance, lisible. Si le projet grossit, on pourra migrer vers awilix ou tsyringe sans toucher au domaine.

### Decision: Authentification via nuxt-auth-utils

Module officiel Nuxt qui fournit `useUserSession()` côté serveur et client. Stockage du mot de passe haché via `argon2` (recommandé en 2026). Sessions en cookie signé.

**Trade-off** : pas de JWT, donc moins adapté si l'API doit un jour être consommée par un client externe. Pour cette v1 mono-client, c'est suffisant.

### Decision: Value Object `Quantity` pour la normalisation des unités

Toutes les quantités traversent un Value Object :

```typescript
// shared/units/quantity.ts
export class Quantity {
  private constructor(
    readonly value: number,    // toujours en unité canonique (g, ml, unit)
    readonly unit: CanonicalUnit
  ) {}

  static fromUserInput(value: number, unit: string): Quantity { /* parse + convert */ }
  toDisplay(targetUnit?: string): { value: number; unit: string } { /* convert back */ }
  add(other: Quantity): Quantity { /* same dimension only */ }
  subtract(other: Quantity): Quantity { /* same dimension only */ }
}
```

**Raisons** : impossible de comparer 1 kg de farine avec 1 unité de pomme — le typage l'empêche par construction.

### Decision: Liste de courses dérivée, snapshot persistable

La liste de courses **n'est pas** une entité de premier rang gérée à la main. C'est le résultat d'un calcul :

```
shoppingList(menu, inventory) = aggregate(menu.ingredients) − inventory
```

Cependant, une fois générée, l'utilisateur veut pouvoir la cocher en magasin. On persiste donc un `ShoppingListSnapshot` :

- Lié à un `MenuId`
- Contient des lignes `{ ingredientName, quantity, unit, isChecked }`
- Peut être régénéré (écrasement explicite) si le menu ou l'inventaire change

### Decision: Tests à 3 niveaux

| Niveau | Outil | Cible |
|---|---|---|
| **Unit** | Vitest | Pure domain (entités, value objects, services de domaine). Aucune dépendance Nuxt/Drizzle. |
| **Integration** | Vitest | Use cases avec repositories **en mémoire** (Fakes). Vérifie l'orchestration. |
| **E2E** (optionnel v1) | Playwright | Parcours UI complet |

Les repositories Drizzle ne sont pas testés directement en v1 (acceptable pour un projet de cette taille). Ajoutable plus tard via testcontainers MariaDB.

## Data Model (vue d'ensemble)

```
┌────────────┐         ┌──────────────┐
│   User     │ N ───── │  Household   │
│            │         │              │
│ id         │         │ id           │
│ email      │         │ name         │
│ password   │         │ invite_code  │
│ household  │         └──────┬───────┘
└────────────┘                │
                              │ owns
                              ▼
              ┌───────────────────────────────────┐
              │                                   │
              ▼                                   ▼
      ┌──────────────┐                   ┌──────────────┐
      │ InventoryItem│                   │   Recipe     │
      │              │                   │              │
      │ id           │                   │ id           │
      │ household_id │                   │ household_id │
      │ name         │                   │ title        │
      │ quantity     │                   │ instructions │
      │ unit         │                   │ servings     │
      │ location     │                   └──────┬───────┘
      └──────────────┘                          │
                                                │ has many
                                                ▼
                                        ┌──────────────────┐
                                        │ RecipeIngredient │
                                        │                  │
                                        │ recipe_id        │
                                        │ name             │
                                        │ quantity         │
                                        │ unit             │
                                        └──────────────────┘

      ┌──────────────┐
      │    Menu      │ 1 ── N ┌──────────────┐
      │              │        │  MenuSlot    │
      │ id           │        │              │
      │ household_id │        │ menu_id      │
      │ week_start   │        │ day_of_week  │
      └──────────────┘        │ meal_type    │ (breakfast/lunch/dinner)
                              │ recipe_id    │
                              │ servings     │
                              └──────────────┘

      ┌─────────────────────┐         ┌──────────────────────┐
      │ ShoppingListSnapshot│ 1 ── N  │ ShoppingListItem     │
      │                     │         │                      │
      │ id                  │         │ snapshot_id          │
      │ menu_id             │         │ ingredient_name      │
      │ generated_at        │         │ quantity             │
      │ household_id        │         │ unit                 │
      └─────────────────────┘         │ is_checked           │
                                      └──────────────────────┘
```

## File Changes (création v1)

Toutes nouvelles créations — voir `tasks.md` pour la liste détaillée.

## Risks & Mitigations

| Risque | Mitigation |
|---|---|
| Couplage involontaire domaine → Drizzle | Règles ESLint pour interdire les imports `drizzle-orm` depuis `domain/` |
| Conversion d'unités erronée | Tests unitaires exhaustifs sur `Quantity` et `conversions.ts` |
| Sessions perdues au redémarrage Docker | Cookie signé avec secret stable (env `NUXT_SESSION_PASSWORD`), pas de session in-memory |
| Migrations DB en prod | `drizzle-kit migrate` exécuté au démarrage du conteneur via un script d'entrée |
| Mots de passe faibles | Validation Zod côté backend (min. 12 caractères, mix recommandé), hash argon2id |
