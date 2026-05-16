# Proposal: Base de connaissance d'ingrédients et produits

## Why

Aujourd'hui, l'inventaire, les recettes et la liste de courses référencent les ingrédients par **chaîne libre** : `ShoppingListBuilder` agrège sur `(name.trim().lowercase(), unité)`. Cette approche est fragile (« tomate cerise » ≠ « tomates cerises » ≠ « tomate-cerise »), ne permet pas de scanner un code-barre, et empêche tout tri par rayon en magasin. Un foyer qui voudrait pré-remplir son inventaire à partir d'un scan ou voir sa liste de courses regroupée par rayon ne peut pas le faire.

Cette base de connaissance partagée fournit le socle qui débloquera ensuite : scan de code-barres (port `IBarcodeResolver` déjà déclaré dans `inventory/`), suggestions de pack-size, tri liste de courses par rayon, alertes péremption, et filtres allergènes/régime sur les recettes.

## What Changes

- **Nouveau bounded context** `ingredients` sous `server/contexts/ingredients/` (séparé de `catalog` qui reste dédié aux recettes).
- **Deux agrégats** : `Ingredient` (générique, source de vérité métier) et `Product` (achetable, qui porte les codes-barres).
  - Un ingrédient ⟶ N produits. Un produit ⟶ 1..N codes-barres (EAN-8/13/UPC normalisés, unique en DB).
- **Nouveaux Value Objects** : `Barcode` (validation format + normalisation), `IngredientCategory` (enum de rayons), `Allergen` (enum des 14 allergènes EU).
- **Nouvelles entités persistées** (Drizzle) : `ingredient`, `ingredient_alias`, `product`, `product_barcode`. Tous **scoped foyer** (`household_id`).
- **Nouveaux use cases** : create/update/delete/list/get pour `Ingredient`, add/update/remove pour `Product`, `resolve-by-barcode`.
- **Nouvelles routes HTTP** : `/api/ingredients`, `/api/ingredients/[id]`, `/api/ingredients/[id]/products`, `/api/products/[id]`, `/api/barcodes/[code]`. Toutes scoped foyer via `requireHouseholdMember()`.
- **Nouvelles pages front** : `/ingredients` (liste + recherche + filtres rayon/storage + CRUD), `/ingredients/[id]` (détail + gestion produits/codes-barres). Composables `useApiIngredients`, `useApiProducts`.
- **Adapter `IBarcodeResolver`** : implémentation Drizzle du port déjà déclaré dans `inventory/domain/ports/barcode-resolver.ts`, branchée dans la composition root.
- **Seed initial** : migration livrant ~50 ingrédients FR courants par foyer à sa création (pâtes, riz, lait, œufs, tomate, oignon, etc.).
- **Migration douce des références existantes** : ajout d'une colonne `ingredient_id` **nullable** sur `inventory_item`, `recipe_ingredient`, `shopping_list_item`. Les anciennes entrées (string libre) restent valides. La résolution automatique string→ingredient est **hors scope** (futur change).

**Hors scope explicite** :
- Migration des données existantes string → `ingredient_id` (futur change).
- Scan caméra côté front (futur change).
- Import de bases externes (OpenFoodFacts…) — port `IBarcodeResolver` distant viendra plus tard.
- Prix par produit / historique de prix.
- Partage du catalogue inter-foyers.

## Capabilities

### New Capabilities

- `ingredients`: catalogue d'ingrédients génériques et de produits achetables par foyer (CRUD, alias, catégories de rayon, allergènes, codes-barres, résolution scan).

### Modified Capabilities

- `inventory`: la requirement existante « Barcode Resolution Port (future-proofing) » évolue — un adapter concret est désormais branché (résout vers `Ingredient` + `Product`) et un article peut référencer un `ingredient_id` optionnel.
- `catalog`: un ingrédient de recette peut désormais référencer optionnellement un `ingredient_id` pour bénéficier des alias, catégorie et allergènes (la string reste autorisée en v1).
- `shopping`: l'agrégation peut désormais fusionner sur `ingredient_id` quand il est présent (en plus de l'agrégation par nom pour les lignes legacy), ce qui donne un tri par rayon.

## Impact

**Code affecté** :
- Nouveau : `server/contexts/ingredients/**`, `shared/dto/ingredient.dto.ts`, `shared/dto/product.dto.ts`, `app/pages/ingredients/**`, `app/composables/useApiIngredients.ts`, `app/composables/useApiProducts.ts`.
- Modifié : `server/database/schema/` (ajout schémas + colonnes nullables sur 3 tables existantes), `server/plugins/container.ts` (nouveaux repos + use cases + adapter `BarcodeResolver`), `server/contexts/inventory/infrastructure/` (adapter), `server/contexts/shopping/application/` (passe par `ingredient_id` si présent), composables existants (champ `ingredientId?` optionnel dans les DTO inventory/recipe).

**DB** : 4 nouvelles tables + 3 colonnes nullables ajoutées. Migration Drizzle générée + migration de seed. Aucune table existante n'est cassée.

**API** : 5 nouvelles routes. Les routes existantes acceptent un `ingredientId?` optionnel dans les payloads create/update — pas de breaking change pour les clients existants.

**Dépendances** : aucune nouvelle dépendance npm. La validation EAN/UPC est codée à la main dans `Barcode` VO (algorithme de checksum trivial).

**Tests** : unit (Barcode, IngredientCategory, Allergen), integration (use cases + smoke HTTP). Pas de nouveaux frameworks.
