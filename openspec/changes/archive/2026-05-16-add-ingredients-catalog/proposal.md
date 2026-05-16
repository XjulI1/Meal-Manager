# Proposal: Base de connaissance d'ingrédients et produits

## Why

Aujourd'hui, l'inventaire, les recettes et la liste de courses référencent les ingrédients par **chaîne libre** : `ShoppingListBuilder` agrège sur `(name.trim().lowercase(), unité canonique)`. Cette approche est fragile (« tomate cerise » ≠ « tomates cerises » ≠ « tomate-cerise »), ne permet pas de scanner un code-barre, et empêche tout tri par rayon en magasin.

Le projet n'a pas encore d'utilisateurs en production : on remplace donc proprement le mode string libre par un référencement systématique vers un nouveau bounded context `ingredients`. Pas de période de coexistence, pas de migration de données, pas de complexité d'agrégation mixte.

Ce socle débloque ensuite : scan de code-barres (port `IBarcodeResolver` déjà déclaré dans `inventory/`), tri liste de courses par rayon, désambiguïsation orthographe/synonymes, alertes péremption, et filtres allergènes/régime sur les recettes.

## What Changes

- **Nouveau bounded context** `ingredients` sous `server/contexts/ingredients/` (séparé de `catalog` qui reste dédié aux recettes).
- **Deux agrégats** : `Ingredient` (générique, source de vérité métier) et `Product` (achetable, qui porte les codes-barres). Un ingrédient ⟶ N produits. Un produit ⟶ 1..N codes-barres (EAN-8/13/UPC normalisés, unique par foyer).
- **Value Objects** : `Barcode` (validation format + checksum + normalisation UPC→EAN-13), `IngredientCategory` (enum de rayons), `Allergen` (enum 14 EU).
- **Nouvelles tables Drizzle** : `ingredient`, `ingredient_alias`, `product`, `product_barcode`. Toutes **scoped foyer** (`household_id`).
- **Use cases ingredients** : create/update/delete/list/get sur Ingredient, add/update/remove sur Product, `resolve-by-barcode`.
- **Routes HTTP** : `/api/ingredients`, `/api/ingredients/[id]`, `/api/ingredients/[id]/products`, `/api/products/[id]`, `/api/barcodes/[code]`. Toutes scoped foyer via `requireHouseholdMember()`.
- **Pages front** : `/ingredients` (liste + recherche + filtres rayon/storage + CRUD), `/ingredients/[id]` (détail + gestion produits/codes-barres). Composables `useApiIngredients`, `useApiProducts`.
- **Adapter `IBarcodeResolver`** : implémentation Drizzle du port déjà déclaré dans `inventory/domain/ports/`, branchée dans la composition root.
- **Seed initial par foyer** (~50 ingrédients FR courants) déclenché à la création du foyer via un port `IHouseholdInitializer` (évite que `family` n'importe `ingredients`). **Devient un prérequis dur** : sans seed, un nouvel utilisateur ne peut rien ajouter à son inventaire ni créer de recette.

### **BREAKING** sur les contextes existants

- **`inventory_item.ingredient_id` devient NOT NULL.** La colonne `inventory_item.name` est **supprimée** (le nom est désormais résolu depuis l'ingrédient au moment de la lecture). La colonne `location` reste (l'utilisateur peut surcharger le `storage` par défaut de l'ingrédient).
- **`recipe_ingredient.ingredient_id` devient NOT NULL.** La colonne `recipe_ingredient.name` est **supprimée**.
- **`shopping_list_item.ingredient_id` devient NOT NULL.** Les colonnes `name` et `category` y restent (snapshot dénormalisé : la liste de courses fige l'état au moment de la génération, indépendamment d'un renommage ultérieur de l'ingrédient).
- **Payloads des routes existantes** : `POST/PATCH /api/inventory` et `POST/PATCH /api/recipes` exigent désormais `ingredientId`. Plus de `name` ni de string libre. **BREAKING** pour le front existant — le front est mis à jour dans le même change.
- **`ShoppingListBuilder`** agrège exclusivement par `(ingredient_id, canonical_unit)` ; la branche string-fallback disparaît.

### Migration dev

Pas d'utilisateurs en production : la migration **drop les colonnes** `name` legacy et **ajoute** `ingredient_id NOT NULL`. Les bases de dev existantes doivent être réinitialisées (`pnpm db:reset` ou `docker compose down -v`). Documenté dans le README.

**Hors scope explicite** :
- Scan caméra côté front (futur change inventory).
- Import de bases externes (OpenFoodFacts…) — port `IBarcodeResolver` distant viendra plus tard.
- Prix / historique de prix par produit.
- Partage du catalogue inter-foyers.
- Note libre par ligne d'inventaire (« pour Adrien », « entamé ») — futur champ si besoin.

## Capabilities

### New Capabilities

- `ingredients`: catalogue d'ingrédients génériques et de produits achetables par foyer (CRUD, alias, catégories de rayon, allergènes, codes-barres, résolution scan, seed initial).

### Modified Capabilities

- `inventory`: un article d'inventaire référence **obligatoirement** un ingrédient ; la requirement « Barcode Resolution Port » reçoit son adapter concret.
- `catalog`: chaque ingrédient d'une recette référence **obligatoirement** un ingrédient du catalogue.
- `shopping`: l'agrégation se fait sur `ingredient_id` (plus de fallback string), et la liste est triable par rayon.

## Impact

**Code créé** :
- `server/contexts/ingredients/**` (domain/application/infrastructure complet)
- `shared/dto/ingredient.dto.ts`, `shared/dto/product.dto.ts`
- `app/pages/ingredients/index.vue`, `app/pages/ingredients/[id].vue`
- `app/composables/useApiIngredients.ts`, `app/composables/useApiProducts.ts`

**Code modifié** :
- `server/database/schema/` : ajout schémas ingredients + `ingredient_id NOT NULL` sur 3 tables existantes + suppression colonnes `name` legacy.
- `server/plugins/container.ts` : nouveaux repos, use cases, adapter `IngredientBarcodeResolver`, `SeedDefaultIngredientsInitializer` injecté dans `CreateHouseholdUseCase`.
- `server/contexts/inventory/**` : entité `InventoryItem` reçoit `ingredientId: string` (non optionnel), drop du champ `name`, validations mises à jour.
- `server/contexts/catalog/**` : `RecipeIngredient.ingredientId` non optionnel, drop du champ `name`.
- `server/contexts/shopping/**` : `ShoppingListBuilder` simplifié (un seul mode d'agrégation), snapshot persiste `ingredientId` + `name` + `category`.
- `app/pages/inventory/**`, `app/pages/recipes/**` : formulaires utilisent un sélecteur/autocomplete d'ingrédient ; champ « nouveau ingrédient » crée à la volée.

**DB** : 4 nouvelles tables, 3 colonnes `ingredient_id NOT NULL` ajoutées, 2 colonnes `name` supprimées (inventory_item, recipe_ingredient). Migration **destructive** sur les schémas existants — base de dev à réinitialiser.

**API** : 5 nouvelles routes. Les routes existantes voient leur contrat changer (BREAKING) : `ingredientId` requis, `name` retiré. Pas de v2 maintenue.

**Dépendances npm** : aucune ajoutée. Validation EAN/UPC codée à la main dans `Barcode` VO.

**Tests** : unit (Barcode, IngredientCategory, Allergen, entités). Integration (use cases + smoke HTTP). Mise à jour des tests inventory/catalog/shopping existants pour exiger `ingredientId`.
