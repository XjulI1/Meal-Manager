# Tasks

Checklist d'implémentation du change `init-meal-manager`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit être dans un état exécutable.

## 1. Bootstrap du projet

- [x] 1.1 Initialiser un projet Nuxt 4 (`npx nuxi init meal-manager`)
- [x] 1.2 Activer le mode TypeScript strict (`strict: true`, `noUncheckedIndexedAccess: true`) dans `tsconfig.json`
- [x] 1.3 Installer et configurer Nuxt UI (`@nuxt/ui`)
- [x] 1.4 Installer Pinia (`@pinia/nuxt`)
- [x] 1.5 Installer Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `mysql2`)
- [x] 1.6 Installer Zod
- [x] 1.7 Installer `nuxt-auth-utils`
- [x] 1.8 Installer Vitest et configurer `vitest.config.ts`
- [x] 1.9 Configurer ESLint + Prettier avec la config Nuxt officielle
- [x] 1.10 Ajouter une règle ESLint interdisant les imports `drizzle-orm` dans `server/contexts/*/domain/**`
- [x] 1.11 Créer la structure de répertoires (`app/`, `server/contexts/`, `server/database/`, `shared/`)
- [x] 1.12 Créer un `README.md` à la racine documentant l'installation locale et la stack

## 2. Infrastructure de base de données

- [x] 2.1 Créer `drizzle.config.ts` pointant vers `server/database/schema/`
- [x] 2.2 Créer `server/database/client.ts` (pool mysql2 + instance Drizzle)
- [x] 2.3 Définir le schéma `users` (`server/database/schema/users.ts`)
- [x] 2.4 Définir le schéma `households` et `household_members`
- [x] 2.5 Définir le schéma `inventory_items`
- [x] 2.6 Définir le schéma `recipes` et `recipe_ingredients`
- [x] 2.7 Définir le schéma `menus` et `menu_slots`
- [x] 2.8 Définir le schéma `shopping_list_snapshots` et `shopping_list_items`
- [x] 2.9 Générer la première migration (`drizzle-kit generate`)
- [x] 2.10 Créer un script `npm run db:migrate` qui exécute les migrations
- [x] 2.11 Documenter la création de la base MariaDB locale dans le README

## 3. Shared — DTO, Value Objects, unités

- [x] 3.1 Créer le Value Object `Quantity` (`shared/units/quantity.ts`)
- [x] 3.2 Créer la table de conversions `shared/units/conversions.ts` (kg↔g, L↔ml, cl↔ml, mg↔g)
- [x] 3.3 Écrire les tests unitaires de `Quantity` (création, conversion, addition, soustraction, erreurs de dimension)
- [x] 3.4 Créer les DTO Zod pour l'authentification (`shared/dto/auth.ts`)
- [x] 3.5 Créer les DTO Zod pour l'inventaire
- [x] 3.6 Créer les DTO Zod pour les recettes
- [x] 3.7 Créer les DTO Zod pour les menus
- [x] 3.8 Créer les DTO Zod pour la liste de courses

## 4. Bounded context : Platform (auth)

- [ ] 4.1 Configurer `nuxt-auth-utils` avec `NUXT_SESSION_PASSWORD`
- [ ] 4.2 Créer l'entité `User` dans `server/contexts/platform/domain/entities/`
- [ ] 4.3 Créer le port `IUserRepository`
- [ ] 4.4 Créer le port `IPasswordHasher` (implémentation argon2)
- [ ] 4.5 Use case `RegisterUserUseCase`
- [ ] 4.6 Use case `LoginUserUseCase`
- [ ] 4.7 Implémenter `DrizzleUserRepository` + mapper
- [ ] 4.8 Implémenter `Argon2PasswordHasher`
- [ ] 4.9 Route `POST /api/auth/register`
- [ ] 4.10 Route `POST /api/auth/login`
- [ ] 4.11 Route `POST /api/auth/logout`
- [ ] 4.12 Middleware `server/middleware/auth.ts` qui hydrate `event.context.user`
- [ ] 4.13 Tests d'intégration des use cases (avec `InMemoryUserRepository`)

## 5. Bounded context : Family (foyer + membres)

- [ ] 5.1 Entité `Household` + Value Object `InviteCode`
- [ ] 5.2 Entité `HouseholdMember`
- [ ] 5.3 Port `IHouseholdRepository`
- [ ] 5.4 Use case `CreateHouseholdUseCase`
- [ ] 5.5 Use case `JoinHouseholdUseCase` (via code d'invitation)
- [ ] 5.6 Use case `LeaveHouseholdUseCase`
- [ ] 5.7 Use case `GetCurrentHouseholdUseCase`
- [ ] 5.8 Implémenter `DrizzleHouseholdRepository`
- [ ] 5.9 Route `POST /api/households` (créer)
- [ ] 5.10 Route `POST /api/households/join`
- [ ] 5.11 Route `GET /api/households/me`
- [ ] 5.12 Middleware vérifiant que l'utilisateur appartient à un foyer
- [ ] 5.13 Tests d'intégration

## 6. Composition root (DI)

- [ ] 6.1 Créer `server/plugins/container.ts` qui instancie tous les repositories et use cases
- [ ] 6.2 Étendre `H3EventContext` avec le type `Container`
- [ ] 6.3 Vérifier qu'aucune route HTTP n'instancie de use case directement (revue manuelle)

## 7. Bounded context : Inventory

- [ ] 7.1 Entité `InventoryItem` + Value Object `StorageLocation` (`pantry` | `fridge`)
- [ ] 7.2 Port `IInventoryItemRepository`
- [ ] 7.3 Port `IBarcodeResolver` (interface seule, pas d'implémentation v1)
- [ ] 7.4 Erreurs : `ItemNotFoundError`, `InvalidQuantityError`
- [ ] 7.5 Use case `AddInventoryItemUseCase`
- [ ] 7.6 Use case `UpdateInventoryItemUseCase`
- [ ] 7.7 Use case `RemoveInventoryItemUseCase`
- [ ] 7.8 Use case `ListInventoryItemsUseCase` (filtrage par location)
- [ ] 7.9 Use case `AdjustQuantityUseCase` (incrément/décrément)
- [ ] 7.10 Implémenter `DrizzleInventoryItemRepository` + mapper
- [ ] 7.11 Route `GET /api/inventory` (avec query `?location=pantry|fridge`)
- [ ] 7.12 Route `POST /api/inventory`
- [ ] 7.13 Route `PATCH /api/inventory/:id`
- [ ] 7.14 Route `DELETE /api/inventory/:id`
- [ ] 7.15 Tests d'intégration

## 8. Bounded context : Catalog (recettes)

- [ ] 8.1 Entité `Recipe`
- [ ] 8.2 Entité/Value Object `RecipeIngredient` (nom, quantité normalisée)
- [ ] 8.3 Port `IRecipeRepository`
- [ ] 8.4 Port `IRecipeImporter` (interface, pas d'implémentation v1)
- [ ] 8.5 Use case `CreateRecipeUseCase`
- [ ] 8.6 Use case `UpdateRecipeUseCase`
- [ ] 8.7 Use case `DeleteRecipeUseCase`
- [ ] 8.8 Use case `ListRecipesUseCase`
- [ ] 8.9 Use case `GetRecipeByIdUseCase`
- [ ] 8.10 Implémenter `DrizzleRecipeRepository` + mapper
- [ ] 8.11 Routes CRUD `/api/recipes`
- [ ] 8.12 Tests d'intégration

## 9. Bounded context : Meal Planning (menus)

- [ ] 9.1 Entité `Menu` (lié à une `weekStart` — lundi)
- [ ] 9.2 Entité `MenuSlot` (jour × repas × recette × portions)
- [ ] 9.3 Value Object `MealType` (`breakfast` | `lunch` | `dinner`)
- [ ] 9.4 Value Object `DayOfWeek`
- [ ] 9.5 Port `IMenuRepository`
- [ ] 9.6 Port `IMenuSuggester` (interface, pas d'implémentation v1)
- [ ] 9.7 Use case `CreateMenuUseCase`
- [ ] 9.8 Use case `AssignRecipeToSlotUseCase`
- [ ] 9.9 Use case `ClearSlotUseCase`
- [ ] 9.10 Use case `GetMenuByWeekUseCase`
- [ ] 9.11 Implémenter `DrizzleMenuRepository`
- [ ] 9.12 Routes `/api/menus` (GET par semaine, POST slots, DELETE slot)
- [ ] 9.13 Tests d'intégration

## 10. Bounded context : Shopping

- [ ] 10.1 Entité `ShoppingListSnapshot`
- [ ] 10.2 Entité `ShoppingListItem` (ingrédient, quantité agrégée, cochable)
- [ ] 10.3 Port `IShoppingListRepository`
- [ ] 10.4 Service de domaine `ShoppingListBuilder` (agrégation des ingrédients par nom, normalisation des unités)
- [ ] 10.5 Use case `GenerateShoppingListFromMenuUseCase` (depuis `MenuId`, agrège les ingrédients × portions, soustrait `InventoryItem`s)
- [ ] 10.6 Use case `ToggleShoppingListItemUseCase` (coché/non coché)
- [ ] 10.7 Use case `RegenerateShoppingListUseCase`
- [ ] 10.8 Implémenter `DrizzleShoppingListRepository`
- [ ] 10.9 Route `POST /api/shopping-lists` (génération depuis `{ menuId }`)
- [ ] 10.10 Route `GET /api/shopping-lists/current`
- [ ] 10.11 Route `PATCH /api/shopping-lists/:id/items/:itemId` (toggle)
- [ ] 10.12 Tests d'intégration (cas clé : ingrédient présent en stock partiellement)

## 11. Front (Nuxt UI)

- [ ] 11.1 Layout principal avec navigation latérale (inventaire, recettes, menu, courses)
- [ ] 11.2 Pages d'auth : `/register`, `/login`
- [ ] 11.3 Page d'onboarding : créer ou rejoindre un foyer
- [ ] 11.4 Page inventaire (`/inventory`) avec onglets placard/frigo
- [ ] 11.5 Formulaire d'ajout/édition d'article (avec sélecteur d'unité)
- [ ] 11.6 Page liste des recettes (`/recipes`)
- [ ] 11.7 Page détail/édition de recette (`/recipes/[id]`)
- [ ] 11.8 Page menu hebdomadaire (`/menu`) — grille 7 jours × 3 repas
- [ ] 11.9 Sélecteur de recettes pour remplir un slot
- [ ] 11.10 Page liste de courses (`/shopping`) avec bouton « Générer depuis le menu » et cases à cocher
- [ ] 11.11 Stores Pinia minimaux (UI state uniquement, pas de logique métier)
- [ ] 11.12 Middleware client `auth.ts` (redirige vers `/login` si pas de session)
- [ ] 11.13 Composables `useApi*` typés via les DTO partagés

## 12. Docker

- [ ] 12.1 Créer un `Dockerfile` multi-stage (`node:22-alpine` → build → runtime avec uniquement `.output/`)
- [ ] 12.2 Créer un `docker-compose.yml` pour le dev local (Nuxt + MariaDB)
- [ ] 12.3 Créer un script d'entrypoint exécutant `drizzle-kit migrate` puis `node .output/server/index.mjs`
- [ ] 12.4 Documenter les variables d'environnement requises dans `.env.example` (`DATABASE_URL`, `NUXT_SESSION_PASSWORD`, etc.)
- [ ] 12.5 Vérifier que l'image build sans erreur (`docker build .`)
- [ ] 12.6 Vérifier que `docker compose up` démarre l'app en local

## 13. Documentation

- [ ] 13.1 README projet : présentation, stack, installation locale, lancement
- [ ] 13.2 Documenter l'architecture hexagonale et la convention de répertoires dans `docs/ARCHITECTURE.md`
- [ ] 13.3 Documenter les conventions de commit (Conventional Commits)
- [ ] 13.4 Lister les variables d'environnement dans le README

## 14. Validation finale

- [ ] 14.1 Exécuter `npm run test` — tous les tests passent
- [ ] 14.2 Exécuter `npm run lint` — pas d'erreur
- [ ] 14.3 Exécuter `npm run build` — build sans erreur
- [ ] 14.4 Parcours manuel : inscription → création foyer → 5 articles inventaire → 2 recettes → menu pour la semaine → génération liste de courses → cocher un item
- [ ] 14.5 Construire l'image Docker et la lancer
- [ ] 14.6 Demander à un agent IA d'exécuter `/opsx:verify` pour vérifier la cohérence avec les specs
- [ ] 14.7 Archiver le change : `/opsx:archive init-meal-manager`
