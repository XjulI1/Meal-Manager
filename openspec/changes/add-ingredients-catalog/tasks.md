# Tasks

Checklist d'implémentation du change `add-ingredients-catalog`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit rester exécutable (`pnpm test` vert, `pnpm build` OK).

## 1. Shared — DTO et Value Objects

- [ ] 1.1 Créer `shared/dto/ingredient.dto.ts` : `IngredientCategorySchema`, `AllergenSchema`, `StorageSchema`, `IngredientCreateSchema`, `IngredientUpdateSchema`, `IngredientListQuerySchema`, `IngredientResponseSchema`
- [ ] 1.2 Créer `shared/dto/product.dto.ts` : `ProductCreateSchema`, `ProductUpdateSchema`, `ProductResponseSchema`, `BarcodeResolutionResponseSchema`
- [ ] 1.3 **BREAKING** Modifier `shared/dto/inventory.ts` : rendre `ingredientId` requis dans create, rendre `location` optionnel, supprimer le champ `name` du payload create/update
- [ ] 1.4 **BREAKING** Modifier `shared/dto/recipe.ts` : rendre `ingredientId` requis dans chaque entrée d'ingrédient, supprimer le champ `name` du payload
- [ ] 1.5 Modifier `shared/dto/shopping-list.ts` : ajouter `ingredientId: string` (non nullable) et `category: string` à chaque item de snapshot dans le schéma de réponse

## 2. Domain — Bounded context `ingredients`

- [ ] 2.1 Créer `server/contexts/ingredients/domain/value-objects/barcode.ts` (validation EAN-8/13 + UPC-A, normalisation UPC→EAN-13, checksum modulo-10)
- [ ] 2.2 Tests unitaires de `Barcode` (`tests/unit/ingredients/barcode.test.ts`) — couvre valid EAN-8, valid EAN-13, valid UPC-A normalized, longueur invalide, non-digit, checksum invalide
- [ ] 2.3 Créer `server/contexts/ingredients/domain/value-objects/ingredient-category.ts` (enum + ordre de tri par rayon : `produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other`)
- [ ] 2.4 Tests unitaires de `IngredientCategory` (parse, ordre)
- [ ] 2.5 Créer `server/contexts/ingredients/domain/value-objects/allergen.ts` (enum 14 EU)
- [ ] 2.6 Tests unitaires `Allergen` (parse, set sans doublon)
- [ ] 2.7 Créer `server/contexts/ingredients/domain/entities/ingredient.ts` (invariants : nom 1–100, canonicalUnit ∈ {g,ml,unit}, aliases unique, méthodes `archive()`, `restore()`, `rename()`, `addAlias()`, `removeAlias()`)
- [ ] 2.8 Créer `server/contexts/ingredients/domain/entities/product.ts` (invariants : packSize > 0, packUnit == ingredient.canonicalUnit, ≥1 barcode, barcodes unique au sein du produit)
- [ ] 2.9 Créer les ports `server/contexts/ingredients/domain/ports/i-ingredient-repository.ts` et `i-product-repository.ts`
- [ ] 2.10 Créer les erreurs `errors/ingredient-not-found.ts`, `product-not-found.ts`, `duplicate-barcode.ts`, `invalid-barcode-format.ts`, `incompatible-pack-unit.ts`, `canonical-unit-locked.ts`, `duplicate-ingredient-name.ts`

## 3. Domain — Cross-context : port pour le seed

- [ ] 3.1 Créer `server/contexts/family/domain/ports/i-household-initializer.ts` : interface avec `initialize(householdId: string): Promise<void>`
- [ ] 3.2 Modifier `CreateHouseholdUseCase` (family) pour accepter une liste `IHouseholdInitializer[]` en dépendance et appeler chaque initializer après création de l'agrégat, dans la même transaction
- [ ] 3.3 Tests unitaires : tous les initializers sont appelés ; une erreur dans l'un rollback la création du foyer (transactionnel)

## 4. Database — schémas Drizzle et migration BREAKING

- [ ] 4.1 Créer `server/database/schema/ingredient.ts` (tables `ingredient`, `ingredient_alias`)
- [ ] 4.2 Créer `server/database/schema/product.ts` (tables `product`, `product_barcode` avec colonne dénormalisée `household_id`)
- [ ] 4.3 **BREAKING** Modifier `server/database/schema/inventory-items.ts` : ajouter `ingredient_id char(36) NOT NULL` + FK + INDEX, supprimer la colonne `name`
- [ ] 4.4 **BREAKING** Modifier `server/database/schema/recipes.ts` (table `recipe_ingredients`) : ajouter `ingredient_id char(36) NOT NULL` + FK + INDEX, supprimer la colonne `name`
- [ ] 4.5 Modifier `server/database/schema/shopping-lists.ts` (table `shopping_list_items`) : ajouter `ingredient_id char(36) NOT NULL` + FK + INDEX + `category varchar(32) NOT NULL DEFAULT 'other'` (la colonne `name` est conservée — snapshot dénormalisé)
- [ ] 4.6 Générer la migration (`pnpm db:generate`) et la commiter
- [ ] 4.7 Ajouter un script `pnpm db:reset` (équivalent `drizzle-kit drop` + recreate) pour faciliter la réinitialisation en dev
- [ ] 4.8 Documenter dans le README la nécessité de `pnpm db:reset` ou `docker compose down -v` avant d'appliquer cette migration sur une base de dev existante
- [ ] 4.9 Vérifier que `pnpm db:migrate` applique la migration sur une base vierge sans erreur

## 5. Infrastructure — repositories et mappers (`ingredients`)

- [ ] 5.1 Créer `server/contexts/ingredients/infrastructure/mappers/ingredient-mapper.ts` (row Drizzle ↔ entité, charge les aliases en sous-requête)
- [ ] 5.2 Créer `server/contexts/ingredients/infrastructure/mappers/product-mapper.ts` (charge les barcodes en sous-requête)
- [ ] 5.3 Implémenter `IngredientRepository` (méthodes : `findById`, `findByHousehold(query)`, `findByNameInHousehold(name)`, `save`, `softDelete`, `hardDelete`, `isReferenced(id)` qui interroge `inventory_item`, `recipe_ingredient`, `shopping_list_item`)
- [ ] 5.4 Implémenter `ProductRepository` (méthodes : `findById`, `findByIngredient`, `findByBarcodeInHousehold(barcode, householdId)`, `save`, `delete`)
- [ ] 5.5 Tests d'intégration avec fakes en mémoire (`tests/integration/ingredients/`) — `FakeIngredientRepository` + `FakeProductRepository`

## 6. Application — use cases (`ingredients`)

- [ ] 6.1 `CreateIngredientUseCase` : valide unicité du nom (case-insensitive, non-archivés via `findByNameInHousehold`), construit l'entité, persiste
- [ ] 6.2 `UpdateIngredientUseCase` : récupère, applique le diff, vérifie l'immutabilité de `canonicalUnit` si en usage (via `isReferenced` ou présence de produits), persiste
- [ ] 6.3 `DeleteIngredientUseCase` : si `isReferenced` → soft delete ; sinon hard delete (cascade aliases + produits)
- [ ] 6.4 `ListIngredientsUseCase` : applique filtres q/category/storage/includeArchived, recherche par nom OU alias
- [ ] 6.5 `GetIngredientUseCase` : récupère un ingrédient + ses produits
- [ ] 6.6 `AddProductToIngredientUseCase` : valide pack_unit == canonicalUnit, valide unicité de chaque barcode dans le foyer, persiste
- [ ] 6.7 `UpdateProductUseCase` : applique le diff, gère le replacement atomique des barcodes
- [ ] 6.8 `RemoveProductUseCase` : hard delete + cascade barcodes
- [ ] 6.9 `ResolveByBarcodeUseCase` : normalise (UPC→EAN-13), cherche dans le foyer, retourne `{ ingredient, product }` ou `null`
- [ ] 6.10 Tests d'intégration de tous les use cases avec les fakes (`tests/integration/ingredients/use-cases/`)

## 7. Application — adapter `IBarcodeResolver` et seed

- [ ] 7.1 Étendre le type `BarcodeResolution` (`server/contexts/inventory/domain/ports/barcode-resolver.ts`) avec les champs optionnels `ingredientId`, `productId`, `storage`, `category`
- [ ] 7.2 Créer `server/contexts/ingredients/infrastructure/ingredient-barcode-resolver.ts` qui implémente le port `IBarcodeResolver` du contexte `inventory` (n'importe que l'interface, pas le contexte) — délègue à `ResolveByBarcodeUseCase` et mappe vers `BarcodeResolution`
- [ ] 7.3 Définir la liste seed `DEFAULT_SEED` dans `server/contexts/ingredients/application/seed-data.ts` (~50 entrées couvrant toutes les catégories ; voir design.md §D12)
- [ ] 7.4 Créer `SeedDefaultIngredientsUseCase` (ingredients/application) : reçoit `householdId`, insère les ingrédients seed (idempotent : si le foyer a déjà des ingrédients, ne fait rien)
- [ ] 7.5 Créer `SeedDefaultIngredientsInitializer` (ingredients/infrastructure) qui implémente `IHouseholdInitializer` en déléguant au use case
- [ ] 7.6 Tests d'intégration du seed : créer un foyer fictif → vérifier ≥30 ingrédients présents, tous avec category + canonicalUnit valides, aucun produit ; vérifier idempotence

## 8. Composition root et plugins

- [ ] 8.1 Mettre à jour `server/plugins/container.ts` : instancier `IngredientRepository`, `ProductRepository`, tous les use cases ingredients, `IngredientBarcodeResolver`, `SeedDefaultIngredientsInitializer`
- [ ] 8.2 Brancher `IngredientBarcodeResolver` comme implémentation de `IBarcodeResolver` (exposé via `container.barcodeResolver`)
- [ ] 8.3 Injecter `SeedDefaultIngredientsInitializer` dans `CreateHouseholdUseCase` (via le tableau d'initializers)
- [ ] 8.4 Vérifier que `pnpm typecheck` passe

## 9. Routes HTTP — `ingredients` et `products`

- [ ] 9.1 `GET /api/ingredients` (`server/api/ingredients/index.get.ts`) : parse query via `IngredientListQuerySchema`, appelle `ListIngredientsUseCase`
- [ ] 9.2 `POST /api/ingredients` (`server/api/ingredients/index.post.ts`)
- [ ] 9.3 `GET /api/ingredients/[id].get.ts`
- [ ] 9.4 `PATCH /api/ingredients/[id].patch.ts`
- [ ] 9.5 `DELETE /api/ingredients/[id].delete.ts`
- [ ] 9.6 `POST /api/ingredients/[id]/products.post.ts`
- [ ] 9.7 `GET /api/products/[id].get.ts`
- [ ] 9.8 `PATCH /api/products/[id].patch.ts`
- [ ] 9.9 `DELETE /api/products/[id].delete.ts`
- [ ] 9.10 `GET /api/barcodes/[code].get.ts` (200 + payload, ou 404)
- [ ] 9.11 Toutes les routes utilisent `requireHouseholdMember()` et instancient via `event.context.container` — aucune n'instancie un use case directement
- [ ] 9.12 Smoke tests HTTP (`tests/integration/http/ingredients.test.ts`) — happy path + 404 cross-household + 400 validation

## 10. Mise à jour BREAKING des contextes existants

- [ ] 10.1 Modifier l'entité `InventoryItem` : remplacer `name: string` par `ingredientId: string`, conserver `location`, `quantity`
- [ ] 10.2 Modifier l'entité `RecipeIngredient` : remplacer `name: string` par `ingredientId: string`, conserver `quantity`, `unit` canonique
- [ ] 10.3 Mettre à jour les mappers Drizzle correspondants (`InventoryItemMapper`, `RecipeIngredientMapper`)
- [ ] 10.4 Mettre à jour les use cases inventory (`AddInventoryItemUseCase`, `UpdateInventoryItemUseCase`) : exiger `ingredientId`, valider qu'il appartient au foyer et est non-archivé, dériver `location` depuis `ingredient.storage` quand absent, valider la compatibilité de dimension (unit ↔ canonicalUnit), refuser le changement de `ingredientId` à l'update
- [ ] 10.5 Mettre à jour les use cases catalog (`CreateRecipeUseCase`, `UpdateRecipeUseCase`) : exiger `ingredientId` sur chaque ligne, mêmes validations
- [ ] 10.6 Mettre à jour `GET /api/inventory` et `GET /api/recipes/:id` pour exposer `ingredientId` + `name` résolu + `category` résolue
- [ ] 10.7 Mettre à jour les tests d'intégration existants (`tests/integration/inventory/`, `tests/integration/catalog/`) pour utiliser `ingredientId` ; supprimer les tests de l'ancien mode string libre
- [ ] 10.8 Mettre à jour les smoke HTTP existants (`tests/integration/http/`) pour passer `ingredientId` dans les payloads

## 11. Refonte du `ShoppingListBuilder`

- [ ] 11.1 Simplifier l'agrégation : une seule clé `(ingredientId, canonicalUnit)`, plus de fallback string
- [ ] 11.2 Simplifier la soustraction d'inventaire : match par `(ingredientId, canonicalUnit)`, plus de fallback string
- [ ] 11.3 Pour chaque entrée persistée : `ingredientId`, `name` dénormalisé (résolu à la génération), `category` dénormalisée (idem)
- [ ] 11.4 Mettre à jour le mapper `ShoppingListItemMapper`
- [ ] 11.5 Mettre à jour les tests existants du builder ; ajouter un test qui vérifie le scénario « renommer un ingrédient après génération ne change pas le snapshot » (delta `shopping/spec.md`)
- [ ] 11.6 Supprimer tout code mort lié à l'agrégation par nom

## 12. Endpoint shopping-lists : tri par rayon

- [ ] 12.1 Modifier le sérialiseur du snapshot pour exposer `category` et `ingredientId` par item
- [ ] 12.2 Trier la sortie par `(categoryOrder, name)` avec `categoryOrder = [produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other]`
- [ ] 12.3 Smoke test : générer une liste mixte de catégories → vérifier l'ordre dans la réponse

## 13. Front — pages et composables (`ingredients`)

- [ ] 13.1 Créer le composable `app/composables/useApiIngredients.ts` (list, get, create, update, delete) typé via les DTO partagés
- [ ] 13.2 Créer le composable `app/composables/useApiProducts.ts` (addToIngredient, get, update, delete, resolveByBarcode)
- [ ] 13.3 Créer la page `app/pages/ingredients/index.vue` : tableau, recherche live (debounce 200ms), filtres `storage` et `category`, bouton « Nouveau »
- [ ] 13.4 Créer la page `app/pages/ingredients/[id].vue` : détail + édition + panneau « Produits / codes-barres »
- [ ] 13.5 Composant `IngredientFormModal.vue` (création/édition complète)
- [ ] 13.6 Composant `IngredientQuickCreateModal.vue` (création rapide à 4 champs : nom, storage, category, canonicalUnit) — utilisé par les écrans inventory/recipes
- [ ] 13.7 Composant `ProductFormModal.vue` (ajout/édition avec champ multi-barcodes)
- [ ] 13.8 Ajouter un lien vers `/ingredients` dans la navigation principale

## 14. Front — mise à jour BREAKING des écrans existants

- [ ] 14.1 Inventaire : remplacer le champ « Nom » par un `<USelectMenu>` (autocomplete sur les ingrédients du foyer), trigger `IngredientQuickCreateModal` pour création à la volée, dériver l'unité depuis le `canonicalUnit` de l'ingrédient sélectionné, pré-remplir `location` depuis `ingredient.storage` (modifiable)
- [ ] 14.2 Recette : même autocomplete + quick-create sur chaque ligne d'ingrédient ; suppression du champ « Nom »
- [ ] 14.3 Liste de courses : afficher les sections par rayon (titre de catégorie + items dessous)
- [ ] 14.4 Mettre à jour les composables `useApiInventory` et `useApiRecipes` pour le nouveau contrat
- [ ] 14.5 Test manuel : créer un foyer → vérifier l'apparition du seed → ajouter un item d'inventaire en sélectionnant un ingrédient seed → créer une recette mixant ingrédients seed et un ingrédient créé via quick-create → générer une liste de courses et vérifier le tri par rayon

## 15. Script utilitaire pour foyers existants (dev)

- [ ] 15.1 Créer `scripts/seed-existing-households.ts` qui parcourt les foyers sans aucun ingrédient et appelle `SeedDefaultIngredientsUseCase` pour chacun
- [ ] 15.2 Ajouter la commande au `package.json` : `"db:seed-existing-households": "tsx scripts/seed-existing-households.ts"`
- [ ] 15.3 Documenter dans le README dans une section « Migration `add-ingredients-catalog` » (incluant l'instruction `db:reset` ou `docker compose down -v`)

## 16. Validation finale

- [ ] 16.1 `pnpm lint` passe (vérifier qu'aucun fichier `server/contexts/ingredients/domain/**` n'importe `drizzle-orm`, `mysql2`, `h3`, `nuxt`, `vue`, ni `~/server/database/*`)
- [ ] 16.2 `pnpm typecheck` passe
- [ ] 16.3 `pnpm test` passe (tous les nouveaux unit + integration, tous les anciens tests inventory/catalog/shopping mis à jour)
- [ ] 16.4 `pnpm build` produit un build propre
- [ ] 16.5 `docker compose down -v && docker compose up --build` : parcours manuel — créer un foyer → vérifier que le seed a livré ≥30 ingrédients → créer un produit avec code-barre → résoudre via `GET /api/barcodes/:code` → ajouter un item d'inventaire en sélectionnant un ingrédient → générer une liste de courses et vérifier le tri par rayon
- [ ] 16.6 `npx -y -p @fission-ai/openspec@latest openspec validate add-ingredients-catalog --strict` passe sans erreur
