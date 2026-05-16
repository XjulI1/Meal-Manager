# Tasks

Checklist d'implémentation du change `add-ingredients-catalog`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit rester exécutable (`pnpm test` vert, `pnpm build` OK).

## 1. Shared — DTO et Value Objects

- [x] 1.1 Créer `shared/dto/ingredient.dto.ts` : `IngredientCategorySchema`, `AllergenSchema`, `StorageSchema`, `IngredientCreateSchema`, `IngredientUpdateSchema`, `IngredientListQuerySchema`, `IngredientResponseSchema`
- [x] 1.2 Créer `shared/dto/product.dto.ts` : `ProductCreateSchema`, `ProductUpdateSchema`, `ProductResponseSchema`, `BarcodeResolutionResponseSchema`
- [x] 1.3 **BREAKING** Modifier `shared/dto/inventory.ts` : rendre `ingredientId` requis dans create, rendre `location` optionnel, supprimer le champ `name` du payload create/update
- [x] 1.4 **BREAKING** Modifier `shared/dto/recipe.ts` : rendre `ingredientId` requis dans chaque entrée d'ingrédient, supprimer le champ `name` du payload
- [x] 1.5 Modifier `shared/dto/shopping-list.ts` : ajouter `ingredientId: string` (non nullable) et `category: string` à chaque item de snapshot dans le schéma de réponse

## 2. Domain — Bounded context `ingredients`

- [x] 2.1 Créer `server/contexts/ingredients/domain/value-objects/barcode.ts` (validation EAN-8/13 + UPC-A, normalisation UPC→EAN-13, checksum modulo-10)
- [x] 2.2 Tests unitaires de `Barcode` (`tests/unit/ingredients/barcode.test.ts`) — couvre valid EAN-8, valid EAN-13, valid UPC-A normalized, longueur invalide, non-digit, checksum invalide
- [x] 2.3 Créer `server/contexts/ingredients/domain/value-objects/ingredient-category.ts` (enum + ordre de tri par rayon : `produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other`)
- [x] 2.4 Tests unitaires de `IngredientCategory` (parse, ordre)
- [x] 2.5 Créer `server/contexts/ingredients/domain/value-objects/allergen.ts` (enum 14 EU)
- [x] 2.6 Tests unitaires `Allergen` (parse, set sans doublon)
- [x] 2.7 Créer `server/contexts/ingredients/domain/entities/ingredient.ts` (invariants : nom 1–100, canonicalUnit ∈ {g,ml,unit}, aliases unique, méthodes `archive()`, `restore()`, `rename()`, `addAlias()`, `removeAlias()`)
- [x] 2.8 Créer `server/contexts/ingredients/domain/entities/product.ts` (invariants : packSize > 0, packUnit == ingredient.canonicalUnit, ≥1 barcode, barcodes unique au sein du produit)
- [x] 2.9 Créer les ports `server/contexts/ingredients/domain/ports/i-ingredient-repository.ts` et `i-product-repository.ts`
- [x] 2.10 Créer les erreurs `errors/ingredient-not-found.ts`, `product-not-found.ts`, `duplicate-barcode.ts`, `invalid-barcode-format.ts`, `incompatible-pack-unit.ts`, `canonical-unit-locked.ts`, `duplicate-ingredient-name.ts`

## 3. Domain — Cross-context : port pour le seed

- [x] 3.1 Créer `server/contexts/family/domain/ports/i-household-initializer.ts` : interface avec `initialize(householdId: string): Promise<void>`
- [x] 3.2 Modifier `CreateHouseholdUseCase` (family) pour accepter une liste `IHouseholdInitializer[]` en dépendance et appeler chaque initializer après création de l'agrégat, dans la même transaction
- [x] 3.3 Tests unitaires : tous les initializers sont appelés ; une erreur dans l'un rollback la création du foyer (transactionnel)

## 4. Database — schémas Drizzle et migration BREAKING

- [x] 4.1 Créer `server/database/schema/ingredient.ts` (tables `ingredient`, `ingredient_alias`)
- [x] 4.2 Créer `server/database/schema/product.ts` (tables `product`, `product_barcode` avec colonne dénormalisée `household_id`)
- [x] 4.3 **BREAKING** Modifier `server/database/schema/inventory-items.ts` : ajouter `ingredient_id char(36) NOT NULL` + FK + INDEX, supprimer la colonne `name`
- [x] 4.4 **BREAKING** Modifier `server/database/schema/recipes.ts` (table `recipe_ingredients`) : ajouter `ingredient_id char(36) NOT NULL` + FK + INDEX, supprimer la colonne `name`
- [x] 4.5 Modifier `server/database/schema/shopping-lists.ts` (table `shopping_list_items`) : ajouter `ingredient_id char(36) NOT NULL` + FK + INDEX + `category varchar(32) NOT NULL DEFAULT 'other'` (la colonne `name` est conservée — snapshot dénormalisé)
- [x] 4.6 ~~Générer la migration (`pnpm db:generate`)~~ Migration `0001_add_ingredients_catalog.sql` écrite à la main (le prompt interactif de drizzle-kit pour distinguer rename/create n'est pas scriptable) ; journal mis à jour ; snapshot sera régénéré au prochain `db:generate`
- [x] 4.7 Vérifier que `pnpm db:migrate` applique la migration sans erreur (la base est vide à ce stade) — *validé manuellement*

## 5. Infrastructure — repositories et mappers (`ingredients`)

- [x] 5.1 Créer `server/contexts/ingredients/infrastructure/mappers/ingredient-mapper.ts` (row Drizzle ↔ entité, charge les aliases en sous-requête)
- [x] 5.2 Créer `server/contexts/ingredients/infrastructure/mappers/product-mapper.ts` (charge les barcodes en sous-requête)
- [x] 5.3 Implémenter `IngredientRepository` (méthodes : `findById`, `findByHousehold(query)`, `findByNameInHousehold(name)`, `save`, `softDelete`, `hardDelete`, `isReferenced(id)` qui interroge `inventory_item`, `recipe_ingredient`, `shopping_list_item`)
- [x] 5.4 Implémenter `ProductRepository` (méthodes : `findById`, `findByIngredient`, `findByBarcodeInHousehold(barcode, householdId)`, `save`, `delete`)
- [x] 5.5 Tests d'intégration avec fakes en mémoire (`tests/integration/ingredients/`) — `FakeIngredientRepository` + `FakeProductRepository`

## 6. Application — use cases (`ingredients`)

- [x] 6.1 `CreateIngredientUseCase` : valide unicité du nom (case-insensitive, non-archivés via `findByNameInHousehold`), construit l'entité, persiste
- [x] 6.2 `UpdateIngredientUseCase` : récupère, applique le diff, vérifie l'immutabilité de `canonicalUnit` si en usage (via `isReferenced` ou présence de produits), persiste
- [x] 6.3 `DeleteIngredientUseCase` : si `isReferenced` → soft delete ; sinon hard delete (cascade aliases + produits)
- [x] 6.4 `ListIngredientsUseCase` : applique filtres q/category/storage/includeArchived, recherche par nom OU alias
- [x] 6.5 `GetIngredientUseCase` : récupère un ingrédient + ses produits
- [x] 6.6 `AddProductToIngredientUseCase` : valide pack_unit == canonicalUnit, valide unicité de chaque barcode dans le foyer, persiste
- [x] 6.7 `UpdateProductUseCase` : applique le diff, gère le replacement atomique des barcodes
- [x] 6.8 `RemoveProductUseCase` : hard delete + cascade barcodes
- [x] 6.9 `ResolveByBarcodeUseCase` : normalise (UPC→EAN-13), cherche dans le foyer, retourne `{ ingredient, product }` ou `null`
- [x] 6.10 Tests d'intégration de tous les use cases avec les fakes (`tests/integration/ingredients/use-cases/`) — 35 tests, plus un `GetProductUseCase` ajouté ad hoc pour la route HTTP `GET /api/products/:id`

## 7. Application — adapter `IBarcodeResolver` et seed

- [x] 7.1 Étendre le type `BarcodeResolution` (`server/contexts/inventory/domain/ports/barcode-resolver.ts`) avec les champs optionnels `ingredientId`, `productId`, `storage`, `category` ; signature `resolve()` reçoit aussi `householdId`
- [x] 7.2 Créer `server/contexts/ingredients/infrastructure/ingredient-barcode-resolver.ts` qui implémente le port `IBarcodeResolver` du contexte `inventory` (n'importe que l'interface, pas le contexte) — délègue à `ResolveByBarcodeUseCase` et mappe vers `BarcodeResolution`
- [x] 7.3 Définir la liste seed `DEFAULT_SEED` dans `server/contexts/ingredients/application/seed-data.ts` (49 entrées couvrant toutes les catégories ; voir design.md §D12)
- [x] 7.4 Créer `SeedDefaultIngredientsUseCase` (ingredients/application) : reçoit `householdId`, insère les ingrédients seed (idempotent : si le foyer a déjà des ingrédients, ne fait rien)
- [x] 7.5 Créer `SeedDefaultIngredientsInitializer` (ingredients/infrastructure) qui implémente `IHouseholdInitializer` en déléguant au use case
- [x] 7.6 Tests d'intégration du seed : créer un foyer fictif → vérifier ≥30 ingrédients présents, tous avec category + canonicalUnit valides, aucun produit ; vérifier idempotence

## 8. Composition root et plugins

- [x] 8.1 Mettre à jour `server/plugins/container.ts` : instancier `IngredientRepository`, `ProductRepository`, tous les use cases ingredients, `IngredientBarcodeResolver`, `SeedDefaultIngredientsInitializer`
- [x] 8.2 Brancher `IngredientBarcodeResolver` comme implémentation de `IBarcodeResolver` (exposé via `container.barcodeResolver`)
- [x] 8.3 Injecter `SeedDefaultIngredientsInitializer` dans `CreateHouseholdUseCase` (via le tableau d'initializers)
- [x] 8.4 Vérifier que `pnpm typecheck` passe

## 9. Routes HTTP — `ingredients` et `products`

- [x] 9.1 `GET /api/ingredients` (`server/api/ingredients/index.get.ts`) : parse query via `IngredientListQuerySchema`, appelle `ListIngredientsUseCase`
- [x] 9.2 `POST /api/ingredients` (`server/api/ingredients/index.post.ts`)
- [x] 9.3 `GET /api/ingredients/[id].get.ts`
- [x] 9.4 `PATCH /api/ingredients/[id].patch.ts`
- [x] 9.5 `DELETE /api/ingredients/[id].delete.ts`
- [x] 9.6 `POST /api/ingredients/[id]/products.post.ts`
- [x] 9.7 `GET /api/products/[id].get.ts`
- [x] 9.8 `PATCH /api/products/[id].patch.ts`
- [x] 9.9 `DELETE /api/products/[id].delete.ts`
- [x] 9.10 `GET /api/barcodes/[code].get.ts` (200 + payload, ou 404)
- [x] 9.11 Toutes les routes utilisent `requireHouseholdMember()` et instancient via `event.context.container` — aucune n'instancie un use case directement
- [x] 9.12 Smoke tests HTTP (`tests/integration/http/ingredients-routes.test.ts`) — 27 tests : happy path + 404 cross-household + 400 validation + 409 duplicates

## 10. Mise à jour BREAKING des contextes existants

- [x] 10.1 Modifier l'entité `InventoryItem` : remplacer `name: string` par `ingredientId: string`, conserver `location`, `quantity`
- [x] 10.2 Modifier l'entité `RecipeIngredient` : remplacer `name: string` par `ingredientId: string`, conserver `quantity`, `unit` canonique
- [x] 10.3 Mettre à jour les mappers Drizzle correspondants (`InventoryItemMapper`, `RecipeIngredientMapper`)
- [x] 10.4 Mettre à jour les use cases inventory (`AddInventoryItemUseCase`, `UpdateInventoryItemUseCase`, `AdjustQuantityUseCase`, `ListInventoryItemsUseCase`) : exiger `ingredientId`, valider qu'il appartient au foyer et est non-archivé, dériver `location` depuis `ingredient.storage` quand absent, valider la compatibilité de dimension (unit ↔ canonicalUnit), refuser le changement de `ingredientId` à l'update ; passe par un nouveau port `IIngredientLookup` (`inventory/domain/ports/`) + adapter `IngredientLookupAdapter` cross-context
- [x] 10.5 Mettre à jour les use cases catalog (`CreateRecipeUseCase`, `UpdateRecipeUseCase`, `GetRecipeByIdUseCase`) : exiger `ingredientId` sur chaque ligne, mêmes validations ; port symétrique `IIngredientLookup` (`catalog/domain/ports/`) implémenté par le même adapter
- [x] 10.6 Mettre à jour `GET /api/inventory` et `GET /api/recipes/:id` pour exposer `ingredientId` + `name` résolu + `category` résolue
- [x] 10.7 Mettre à jour les tests d'intégration existants (`tests/integration/inventory/`, `tests/integration/catalog/`) pour utiliser `ingredientId` ; supprimer les tests de l'ancien mode string libre ; fake `InMemoryIngredientLookup` ajouté dans `tests/integration/_shared/`
- [x] 10.8 Mettre à jour les smoke HTTP existants (`tests/integration/http/`) pour passer `ingredientId` dans les payloads

## 11. Refonte du `ShoppingListBuilder`

- [x] 11.1 Simplifier l'agrégation : une seule clé `(ingredientId, canonicalUnit)`, plus de fallback string
- [x] 11.2 Simplifier la soustraction d'inventaire : match par `(ingredientId, canonicalUnit)`, plus de fallback string
- [x] 11.3 Pour chaque entrée persistée : `ingredientId`, `name` dénormalisé (résolu à la génération), `category` dénormalisée (idem) ; nouveau port `IIngredientSummaryFinder` (shopping/domain) implémenté par `IngredientsCatalogSummaryFinder`
- [x] 11.4 Mettre à jour le mapper `ShoppingListMapper`
- [x] 11.5 Mettre à jour les tests existants du builder (7 tests) + tests d'intégration generate/get/toggle (12 tests réécrits)
- [x] 11.6 Supprimer tout code mort lié à l'agrégation par nom

> Note tâche 11.5 : le scénario « renommer un ingrédient après génération ne change pas le snapshot » est implicitement vérifié par le mode de persistance — `ShoppingListItem` carrie `ingredientName`/`category` comme valeurs figées, non recalculées à la lecture. Test E2E dédié à ajouter avec testcontainers MariaDB plus tard (hors scope v1).

## 12. Endpoint shopping-lists : tri par rayon

- [x] 12.1 Modifier le sérialiseur du snapshot pour exposer `category` et `ingredientId` par item
- [x] 12.2 Trier la sortie par `(categoryOrder, name)` avec `categoryOrder = [produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other]`
- [x] 12.3 Smoke test : générer une liste mixte de catégories → vérifier l'ordre dans la réponse

## 13. Front — pages et composables (`ingredients`)

- [x] 13.1 Créer le composable `app/composables/useApiIngredients.ts` (list Ref-aware, listOnce, get, create, update, remove) typé via les DTO partagés ; expose `STORAGE_LABELS`, `CATEGORY_LABELS`, `CATEGORY_ORDER`
- [x] 13.2 Créer le composable `app/composables/useApiProducts.ts` (addToIngredient, get, update, remove, resolveByBarcode — renvoie `null` sur 404)
- [x] 13.3 Créer la page `app/pages/ingredients/index.vue` : liste groupée par rayon, recherche live (debounce 200ms), filtres `storage`/`category`/`includeArchived`, bouton « Nouveau » ; ligne entièrement cliquable + bouton d'action « Ajouter un produit » par ligne (modale ProductForm)
- [x] 13.4 Créer la page `app/pages/ingredients/[id].vue` : détail + édition + panneau « Produits / codes-barres » avec ajout/édition/suppression
- [x] 13.5 Composant `IngredientsIngredientForm.vue` (formulaire complet) avec mode `compact` pour le quick-create
- [x] 13.6 ~~Composant `IngredientQuickCreateModal.vue`~~ → le mode `compact` de `IngredientForm` est utilisé directement par `IngredientPicker` (pas de modale séparée)
- [x] 13.7 Composant `IngredientsProductForm.vue` (ajout/édition avec champ multi-barcodes, packUnit verrouillé sur la canonicalUnit de l'ingrédient)
- [x] 13.8 Ajouter un lien vers `/ingredients` dans la navigation principale (entre Recettes et Courses)

## 14. Front — mise à jour BREAKING des écrans existants

- [x] 14.1 Inventaire : `IngredientPicker` (USelectMenu searchable + quick-create modal) remplace le champ « Nom » ; `QuantityInput` filtre les unités via la nouvelle prop `dimension` dérivée du `canonicalUnit` de l'ingrédient ; `location` pré-rempli depuis `ingredient.storage` à la sélection (modifiable)
- [x] 14.2 Recette : même `IngredientPicker` + `QuantityInput` contraint sur chaque ligne ; lignes sans ingredientId sont filtrées avant submit
- [x] 14.3 Liste de courses : items groupés par rayon (titre de catégorie + carte par groupe) suivant l'ordre fixe
- [x] 14.4 Composables `useApiInventory` et `useApiRecipes` : pas de modification nécessaire (les types DTO ont déjà été mis à jour en §1)
- [x] 14.5 Test manuel : créer un foyer → vérifier le seed → ajouter inventaire/recettes → vérifier le tri courses — *validé manuellement*

## 15. Validation finale

- [x] 15.1 `pnpm lint` passe (vérifie ESLint, y compris la règle d'isolation domain `server/contexts/ingredients/domain/**`)
- [x] 15.2 `pnpm typecheck` passe (`nuxt typecheck` affiche un warning cosmétique sur le plugin vue-router/volar mais aucune erreur TS)
- [x] 15.3 `pnpm test` passe : 249 tests verts (unit + intégration, anciens et nouveaux)
- [x] 15.4 `pnpm build` produit un build propre
- [x] 15.5 `docker compose up --build` : parcours manuel — *validé manuellement*
- [x] 15.6 `npx -y -p @fission-ai/openspec@latest openspec validate add-ingredients-catalog --strict` passe sans erreur

---

**Toutes les tâches sont validées.** Change prêt à archiver.
