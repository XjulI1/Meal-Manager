# Tasks

Checklist d'implémentation du change `add-ingredients-catalog`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit rester exécutable (`pnpm test` vert, `pnpm build` OK).

## 1. Shared — DTO et Value Objects

- [ ] 1.1 Créer `shared/dto/ingredient.dto.ts` : `IngredientCategorySchema`, `AllergenSchema`, `StorageSchema`, `IngredientCreateSchema`, `IngredientUpdateSchema`, `IngredientListQuerySchema`, `IngredientResponseSchema`
- [ ] 1.2 Créer `shared/dto/product.dto.ts` : `ProductCreateSchema`, `ProductUpdateSchema`, `ProductResponseSchema`, `BarcodeResolutionResponseSchema`
- [ ] 1.3 Étendre `shared/dto/inventory.ts` pour accepter `ingredientId?: string` dans create/update (et rendre `name` et `location` optionnels quand `ingredientId` est présent)
- [ ] 1.4 Étendre `shared/dto/recipe.ts` pour accepter `ingredientId?: string` dans chaque entrée d'ingrédient (et rendre `name` optionnel quand `ingredientId` est présent)
- [ ] 1.5 Étendre `shared/dto/shopping-list.ts` pour exposer `ingredientId: string | null` et `category: string` sur chaque item de snapshot

## 2. Domain — Bounded context `ingredients`

- [ ] 2.1 Créer `server/contexts/ingredients/domain/value-objects/barcode.ts` (validation EAN-8/13 + UPC-A, normalisation UPC→EAN-13, checksum modulo-10)
- [ ] 2.2 Tests unitaires de `Barcode` (`tests/unit/ingredients/barcode.test.ts`) — couvre valid EAN-8, valid EAN-13, valid UPC-A normalized, longueur invalide, non-digit, checksum invalide
- [ ] 2.3 Créer `server/contexts/ingredients/domain/value-objects/ingredient-category.ts` (enum + ordre de tri par rayon)
- [ ] 2.4 Tests unitaires de `IngredientCategory` (parse, ordre)
- [ ] 2.5 Créer `server/contexts/ingredients/domain/value-objects/allergen.ts` (enum 14 EU)
- [ ] 2.6 Tests unitaires `Allergen` (parse, set sans doublon)
- [ ] 2.7 Créer `server/contexts/ingredients/domain/entities/ingredient.ts` (invariants : nom 1–100, canonicalUnit ∈ {g,ml,unit}, aliases unique, methods `archive()`, `restore()`, `rename()`, `addAlias()`, `removeAlias()`)
- [ ] 2.8 Créer `server/contexts/ingredients/domain/entities/product.ts` (invariants : packSize > 0, packUnit == ingredient.canonicalUnit, ≥1 barcode, barcodes unique au sein du produit)
- [ ] 2.9 Créer les ports `server/contexts/ingredients/domain/ports/i-ingredient-repository.ts` et `i-product-repository.ts`
- [ ] 2.10 Créer les erreurs `errors/ingredient-not-found.ts`, `product-not-found.ts`, `duplicate-barcode.ts`, `invalid-barcode-format.ts`, `incompatible-pack-unit.ts`, `canonical-unit-locked.ts`, `duplicate-ingredient-name.ts`

## 3. Domain — Cross-context : port pour le seed

- [ ] 3.1 Créer `server/contexts/family/domain/ports/i-household-initializer.ts` : interface avec `initialize(householdId: string): Promise<void>`
- [ ] 3.2 Modifier `CreateHouseholdUseCase` (family) pour accepter une liste `IHouseholdInitializer[]` en dépendance et appeler chaque initializer après création
- [ ] 3.3 Tests unitaires : vérifier que tous les initializers sont appelés (ordre + une erreur dans l'un échoue la création — rollback transactionnel)

## 4. Database — schémas Drizzle et migration

- [ ] 4.1 Créer `server/database/schema/ingredient.ts` (tables `ingredient`, `ingredient_alias`)
- [ ] 4.2 Créer `server/database/schema/product.ts` (tables `product`, `product_barcode` avec colonne dénormalisée `household_id`)
- [ ] 4.3 Modifier `server/database/schema/inventory-items.ts` : ajouter colonne `ingredient_id char(36) NULL` + FK + INDEX
- [ ] 4.4 Modifier `server/database/schema/recipes.ts` (table `recipe_ingredients`) : ajouter `ingredient_id char(36) NULL` + FK + INDEX
- [ ] 4.5 Modifier `server/database/schema/shopping-lists.ts` (table `shopping_list_items`) : ajouter `ingredient_id char(36) NULL` + `category varchar(32) NOT NULL DEFAULT 'other'` + INDEX
- [ ] 4.6 Générer la migration (`pnpm db:generate`) et la commiter dans `server/database/migrations/`
- [ ] 4.7 Vérifier que `pnpm db:migrate` applique la migration sur une base vierge sans erreur

## 5. Infrastructure — repositories et mappers (`ingredients`)

- [ ] 5.1 Créer `server/contexts/ingredients/infrastructure/mappers/ingredient-mapper.ts` (row Drizzle ↔ entité, gère aliases en sous-requête)
- [ ] 5.2 Créer `server/contexts/ingredients/infrastructure/mappers/product-mapper.ts` (gère barcodes en sous-requête)
- [ ] 5.3 Implémenter `IngredientRepository` (méthodes : `findById`, `findByHousehold(query)`, `findByNameInHousehold(name)`, `save`, `softDelete`, `hardDelete`, `isReferenced(id)`)
- [ ] 5.4 Implémenter `ProductRepository` (méthodes : `findById`, `findByIngredient`, `findByBarcodeInHousehold(barcode, householdId)`, `save`, `delete`)
- [ ] 5.5 Tests d'intégration des repositories en mémoire (`tests/integration/ingredients/repositories.test.ts`) — version `FakeIngredientRepository` + `FakeProductRepository`

## 6. Application — use cases (`ingredients`)

- [ ] 6.1 `CreateIngredientUseCase` : valide unicité du nom (case-insensitive, non archivés), construit l'entité, persiste
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

- [ ] 7.1 Créer `server/contexts/ingredients/infrastructure/ingredient-barcode-resolver.ts` qui implémente le port `IBarcodeResolver` du contexte `inventory` (importe l'interface uniquement, pas le contexte) — appelle `ResolveByBarcodeUseCase` en interne et mappe vers le type `BarcodeResolution`
- [ ] 7.2 Étendre le type `BarcodeResolution` (`server/contexts/inventory/domain/ports/barcode-resolver.ts`) avec les champs optionnels `ingredientId`, `productId`, `storage`
- [ ] 7.3 Créer `SeedDefaultIngredientsUseCase` (ingredients/application) : reçoit `householdId`, insère ~50 ingrédients FR de base (idempotent : si le foyer a déjà des ingrédients, ne fait rien)
- [ ] 7.4 Créer `SeedDefaultIngredientsInitializer` (ingredients/infrastructure) qui implémente `IHouseholdInitializer` en déléguant au use case
- [ ] 7.5 Définir la liste des ingrédients seed (constante `DEFAULT_SEED` dans `server/contexts/ingredients/application/seed-data.ts`) avec ~50 entrées couvrant toutes les catégories
- [ ] 7.6 Tests d'intégration du seed : créer un foyer fictif → vérifier ≥30 ingrédients présents, tous avec category + canonicalUnit valides, aucun produit

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
- [ ] 9.6 `POST /api/ingredients/[id]/products.post.ts` (ajoute un produit à un ingrédient)
- [ ] 9.7 `GET /api/products/[id].get.ts`
- [ ] 9.8 `PATCH /api/products/[id].patch.ts`
- [ ] 9.9 `DELETE /api/products/[id].delete.ts`
- [ ] 9.10 `GET /api/barcodes/[code].get.ts` (résolution scan : 200 + payload, ou 404)
- [ ] 9.11 Toutes les routes utilisent `requireHouseholdMember()` et instancient via `event.context.container` — aucune n'instancie un use case directement
- [ ] 9.12 Smoke tests HTTP pour chaque route (`tests/integration/http/ingredients.test.ts`) — happy path + 404 cross-household + 400 validation

## 10. Impact sur les routes existantes (mode mixte)

- [ ] 10.1 `POST /api/inventory` et `PATCH /api/inventory/:id` : accepter `ingredientId?`, valider qu'il appartient au foyer et est non-archivé, dériver `name`/`location` quand absent, vérifier la compatibilité d'unité
- [ ] 10.2 `POST /api/recipes` et `PATCH /api/recipes/:id` : pour chaque ingredient, accepter `ingredientId?`, mêmes validations que ci-dessus
- [ ] 10.3 Mettre à jour `InventoryItem` (entité de domaine) avec un champ optionnel `ingredientId`
- [ ] 10.4 Mettre à jour `RecipeIngredient` (entité de domaine) avec un champ optionnel `ingredientId`
- [ ] 10.5 Mettre à jour les mappers Drizzle correspondants
- [ ] 10.6 Tests d'intégration : créer/lire un inventory item bound à un ingredient ; créer/lire une recette mixte ; rejeter 400 si unit incompatible ; rejeter 400 si ingrédient d'un autre foyer

## 11. Mise à jour du `ShoppingListBuilder`

- [ ] 11.1 Modifier l'agrégation pour partitionner d'abord par présence/absence d'`ingredient_id`
- [ ] 11.2 Agrégation des entrées avec `ingredient_id` : key = `(ingredient_id, canonical_unit)`
- [ ] 11.3 Agrégation des entrées sans `ingredient_id` (legacy) : key = `(name.lower.trim, canonical_unit)`, jamais fusionné avec une entrée bound
- [ ] 11.4 Soustraction inventaire : par `ingredient_id` quand présent ; par nom uniquement avec les inventory items non-bound sinon
- [ ] 11.5 Pour chaque entrée persistée, calculer le `category` : depuis l'ingrédient si bound, sinon `other`
- [ ] 11.6 Tests d'intégration du builder couvrant les 3 scénarios du delta `shopping/spec.md` : legacy seul, bound seul, mixte (jamais merge)

## 12. Endpoint shopping-lists : tri par rayon

- [ ] 12.1 Modifier le sérialiseur du snapshot pour exposer `category` et `ingredientId` par item
- [ ] 12.2 Trier la sortie par `(categoryOrder, name)` avec `categoryOrder = [produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other]`
- [ ] 12.3 Smoke test : générer une liste mixte → vérifier l'ordre par rayon dans la réponse

## 13. Front — pages et composables

- [ ] 13.1 Créer le composable `app/composables/useApiIngredients.ts` (list, get, create, update, delete) typé via les DTO partagés
- [ ] 13.2 Créer le composable `app/composables/useApiProducts.ts` (addToIngredient, get, update, delete, resolveByBarcode)
- [ ] 13.3 Créer la page `app/pages/ingredients/index.vue` : tableau, recherche live (debounce 200ms), filtres `storage` et `category`, bouton « Nouveau »
- [ ] 13.4 Créer la page `app/pages/ingredients/[id].vue` : détail + édition + panneau « Produits / codes-barres »
- [ ] 13.5 Composant `IngredientFormModal.vue` (création/édition)
- [ ] 13.6 Composant `ProductFormModal.vue` (ajout/édition avec champ multi-barcodes)
- [ ] 13.7 Ajouter un lien vers `/ingredients` dans la navigation principale
- [ ] 13.8 Test manuel : créer un ingrédient, lui ajouter un produit avec code-barre, vérifier qu'il apparaît dans la liste et qu'il est trouvable par recherche/alias

## 14. Mise à jour des écrans existants (référencement optionnel)

- [ ] 14.1 Inventaire : dans le formulaire d'ajout, proposer un autocomplete sur les ingrédients du foyer ; quand un ingrédient est sélectionné, pré-remplir `name`/`location` et n'exposer que les unités compatibles avec sa dimension
- [ ] 14.2 Recette : même autocomplete sur chaque ligne d'ingrédient
- [ ] 14.3 Liste de courses : afficher les sections par rayon (titre de catégorie + items dessous)
- [ ] 14.4 Test manuel : créer un item d'inventaire bound + un item legacy → la liste de courses générée regroupe correctement par rayon

## 15. Script utilitaire pour foyers existants

- [ ] 15.1 Créer `scripts/seed-existing-households.ts` qui parcourt les foyers sans aucun ingrédient et appelle `SeedDefaultIngredientsUseCase` pour chacun
- [ ] 15.2 Ajouter la commande au `package.json` : `"db:seed-existing-households": "tsx scripts/seed-existing-households.ts"`
- [ ] 15.3 Documenter dans le README dans une section « Migration `add-ingredients-catalog` »

## 16. Validation finale

- [ ] 16.1 `pnpm lint` passe (vérifier qu'aucun fichier `server/contexts/ingredients/domain/**` n'importe `drizzle-orm`, `mysql2`, `h3`, `nuxt`, `vue`, ni `~/server/database/*`)
- [ ] 16.2 `pnpm typecheck` passe
- [ ] 16.3 `pnpm test` passe (tous les nouveaux unit + integration)
- [ ] 16.4 `pnpm build` produit un build propre
- [ ] 16.5 `docker compose up --build` démarre l'application ; parcours manuel : créer un foyer → vérifier que le seed a livré ≥30 ingrédients → créer un produit avec code-barre → résoudre via `GET /api/barcodes/:code` → ajouter un item d'inventaire bound → générer une liste de courses et vérifier le tri par rayon
- [ ] 16.6 `npx -y -p @fission-ai/openspec@latest openspec validate add-ingredients-catalog --strict` passe sans erreur
