# Design: Base de connaissance d'ingrédients et produits

## Context

Le change initial (`init-meal-manager`) a livré un MVP où l'inventaire, les recettes et la liste de courses référencent les ingrédients par chaîne libre. `ShoppingListBuilder` agrège sur `(name.trim().lowercase(), unité canonique)`. Cette approche fonctionnelle est volontairement simpliste et identifiée comme à remplacer dès qu'on veut :

- Scanner un code-barre pour ajouter un article (le port `IBarcodeResolver` existe déjà dans `inventory/domain/ports/` mais sans adapter).
- Trier la liste de courses par rayon en magasin.
- Désambiguïser orthographes/synonymes (« tomate cerise » vs « tomates cerises »).
- Filtrer les recettes par allergène ou régime.
- Pré-remplir l'inventaire avec le stockage (frais/placard) sans demander à l'utilisateur.

**Aucun utilisateur n'est en production.** On profite de cette fenêtre pour faire un changement direct : `ingredient_id` devient obligatoire, le mode string libre disparaît, pas de période transitoire ni de logique d'agrégation mixte à maintenir. La complexité retirée par rapport à une approche rétro-compatible est significative (un seul chemin de code dans le builder, dans les use cases, dans les formulaires).

## Goals / Non-Goals

**Goals :**
- Fournir un agrégat `Ingredient` (générique) et un agrégat `Product` (achetable) bien séparés, avec une relation 1..N claire.
- Implémenter le port `IBarcodeResolver` déjà déclaré dans `inventory`, sans casser la requirement « port presence » existante.
- Pouvoir scanner un code-barre et obtenir `{ ingredient, product }` (le client décide ensuite quoi en faire).
- Garder le domaine isolé : aucune dépendance Drizzle/mysql2/h3/Vue dans `server/contexts/ingredients/domain/**` (règle ESLint déjà active).
- Permettre une recherche par nom + alias (`useApiIngredients`) avec filtres rayon et storage.
- Livrer un seed d'ingrédients FR courants par foyer pour démarrer — c'est désormais un prérequis dur de l'usage.
- Simplifier `ShoppingListBuilder` : un seul mode d'agrégation, par `ingredient_id`.

**Non-Goals :**
- Mode de coexistence string libre / `ingredient_id`. Explicitement refusé : pas d'utilisateurs en prod, pas besoin.
- Scan caméra dans le front (sera une feature inventory plus tard, avec une lib type `zxing-js`).
- Import OpenFoodFacts ou autre base externe — sera un adapter alternatif d'`IBarcodeResolver` plus tard.
- Prix par produit, historique, comparateur.
- Catalogue partagé inter-foyers (forte tentation, mais ouvre une boîte de Pandore RGPD/modération — repoussé).
- Champ « stock minimum / par défaut » par ingrédient (pourrait alimenter une auto-suggestion liste de courses, hors scope).
- Note libre sur les lignes d'inventaire (« pour Adrien »). Si besoin, ce sera un nouveau champ `note` distinct du nom — pas dans ce change.

## Decisions

### D1. Foyer-scoped, pas global

**Décision :** chaque foyer possède son propre catalogue `Ingredient` + `Product`. Toutes les tables ont `household_id`.

**Alternatives considérées :**
- *Catalogue global lecture seule + override par foyer.* Plus efficace en stockage mais oblige à gérer modération, propriété, conflits de nommage, et casse l'isolation foyer qui est un principe structurant du projet.
- *Catalogue global pour le seed + extension par foyer.* Tentant, mais introduit deux sources (global vs foyer) que toutes les requêtes doivent fusionner. Trop de complexité pour la v1.

**Raison :** cohérent avec le reste de l'app (inventory, recipes, menus sont tous foyer-scoped), zéro question de modération, et chaque foyer peut adapter le catalogue à son langage (« courgette » vs « zucchini ») sans impacter les autres. Le coût en stockage est négligeable (~50 lignes seed × N foyers ≪ 1 Mo).

### D2. Deux agrégats : Ingredient et Product (v1+)

**Décision :** deux agrégats distincts. `Ingredient` est l'entité métier référencée partout. `Product` est l'objet achetable (codes-barres, marque, conditionnement).

**Alternatives :**
- *v1 simple : code-barre directement sur Ingredient (liste).* Plus rapide mais bloque les cas multi-marques et oblige à dupliquer un ingrédient pour deux conditionnements différents.

**Raison :** l'utilisateur l'a tranché en faveur de la v1+. Le coût supplémentaire est minime (deux tables au lieu d'une), et la séparation suit la sémantique métier (un yaourt nature, c'est un ingrédient ; les 7 marques en supermarché, ce sont 7 produits).

### D3. Stockage (`pantry`/`fridge`) sur l'ingrédient, surchargeable par article

**Décision :** `Ingredient.storage` est `'pantry' | 'fridge'` (valeur **par défaut**). `InventoryItem.location` reste sur l'article et **peut différer** de la valeur de l'ingrédient (exemple : « j'ai exceptionnellement mis ma sauce tomate ouverte au frigo »).

Au scan d'un code-barre ou à la sélection d'un ingrédient dans le formulaire d'inventaire, le client pré-remplit `location` avec `ingredient.storage`. L'utilisateur peut changer.

**Alternative :** dériver `location` strictement de l'ingrédient (pas de colonne sur l'article). Rejetée — perdrait les cas légitimes de surcharge.

### D4. Catégorie (rayon) en enum borné

**Décision :** `IngredientCategory` est un enum fermé :
`produce | dairy | bakery | meat-fish | frozen | grocery | beverages | household | other`

**Raison :** suffisant pour trier la liste de courses par rayon. Étendre l'enum plus tard est trivial (ajouter une valeur, migration `mysqlEnum`). Une string libre ouvrirait la porte à des typos et casserait le tri.

### D5. Allergènes : enum des 14 EU

**Décision :** `Allergen` enum sur les 14 allergènes EU réglementaires :
`gluten | crustaceans | eggs | fish | peanuts | soy | milk | nuts | celery | mustard | sesame | sulphites | lupin | molluscs`

Stocké comme **set** (colonne JSON sur `ingredient` — voir D9).

**Raison :** standard légal européen, suffisant pour la v1. Pas de différenciation « trace de » vs « contient » en v1.

### D6. Format de code-barre

**Décision :** le VO `Barcode` accepte EAN-8 (8 chiffres), EAN-13 (13 chiffres) et UPC-A (12 chiffres, normalisé en EAN-13 par préfixage `0`). Validation du **checksum** dans le VO. Stocké en string (max 14 chars).

**Raison :** couvre 99% des produits alimentaires européens. Algorithme de checksum est trivial (modulo 10 sur somme pondérée). Normaliser UPC→EAN-13 en stockage évite les doublons.

**Hors v1 :** GS1-128 (codes étendus, lots/poids variables), QR codes.

### D7. Unicité des codes-barres

**Décision :** un code-barre est **unique par foyer** (`UNIQUE(household_id, barcode)`), pas globalement. Scanner le même code dans deux foyers permet à chacun de l'attacher à son propre `Product`.

**Alternative :** unique global. Rejetée — incompatible avec D1.

### D8. Soft-delete des ingrédients référencés

**Décision :** `Ingredient.deletedAt` (nullable). Si un ingrédient est référencé par au moins une ligne d'inventaire, recette ou snapshot de liste de courses, le `DELETE` marque soft-delete au lieu de supprimer en cascade. Le client le voit comme « archivé » et il n'apparaît plus dans les listes (`?includeArchived=true` pour le récupérer).

**Alternative :** hard delete + cascade comme on fait pour les recettes (`Deleting a Recipe`). Rejetée — supprimer un ingrédient ne doit pas effacer silencieusement une ligne d'inventaire ou un ingrédient de recette ; ça surprendrait l'utilisateur. Pour `Product`, hard delete reste possible (un produit n'est jamais référencé par d'autres entités, seuls les codes-barres lui appartiennent).

**Note :** comme `ingredient_id` est NOT NULL partout, on n'a *pas* à craindre une référence orpheline ; un ingrédient archivé reste résolvable par son id (le FK reste valide).

### D9. Schéma DB

```
ingredient
  id             char(36) PK
  household_id   char(36) FK -> household.id ON DELETE CASCADE, INDEX
  name           varchar(100) NOT NULL
  storage        ENUM('pantry','fridge') NOT NULL
  category       ENUM(...) NOT NULL
  canonical_unit ENUM('g','ml','unit') NOT NULL
  shelf_life_days INT UNSIGNED NULL
  image_url      varchar(500) NULL
  default_pack_size INT UNSIGNED NULL        -- en unité canonique
  allergens      JSON NULL                    -- array de string (enum Allergen)
  deleted_at     datetime NULL
  created_at     datetime NOT NULL
  updated_at     datetime NOT NULL
  -- Unicité du nom au sein des actifs : enforced applicativement
  -- (MariaDB ne supporte pas les unique partial indexes ; on
  -- gère côté CreateIngredientUseCase via SELECT WHERE deleted_at IS NULL)

ingredient_alias
  id             char(36) PK
  ingredient_id  char(36) FK -> ingredient.id ON DELETE CASCADE
  alias          varchar(100) NOT NULL
  UNIQUE(ingredient_id, alias)
  INDEX(alias)   -- pour recherche

product
  id             char(36) PK
  household_id   char(36) FK -> household.id ON DELETE CASCADE, INDEX
  ingredient_id  char(36) FK -> ingredient.id ON DELETE CASCADE
  brand          varchar(100) NULL
  pack_size      INT UNSIGNED NOT NULL        -- en unité canonique de l'ingrédient
  pack_unit      ENUM('g','ml','unit') NOT NULL  -- DOIT == ingredient.canonical_unit
  image_url      varchar(500) NULL
  created_at     datetime NOT NULL
  updated_at     datetime NOT NULL

product_barcode
  id             char(36) PK
  product_id     char(36) FK -> product.id ON DELETE CASCADE
  household_id   char(36) NOT NULL   -- dénormalisé pour permettre l'index unique
  barcode        varchar(14) NOT NULL
  UNIQUE(household_id, barcode)
  INDEX(barcode)
```

**Allergènes en JSON vs table de jointure :** JSON suffit en v1 (lecture exclusive depuis l'ingrédient, pas de requête « recettes sans gluten » dans ce change). Si plus tard on veut filtrer/indexer, on extrait dans une table.

### D10. Modifications BREAKING des tables existantes

Pas d'utilisateurs en production : on fait une migration franche, pas de colonnes optionnelles temporaires.

```
inventory_item:
  ADD COLUMN ingredient_id char(36) NOT NULL, ADD FK -> ingredient.id, ADD INDEX
  DROP COLUMN name

recipe_ingredient:
  ADD COLUMN ingredient_id char(36) NOT NULL, ADD FK -> ingredient.id, ADD INDEX
  DROP COLUMN name

shopping_list_item:
  ADD COLUMN ingredient_id char(36) NOT NULL, ADD FK -> ingredient.id, ADD INDEX
  ADD COLUMN category varchar(32) NOT NULL DEFAULT 'other'
  -- la colonne `name` reste : snapshot dénormalisé (le snapshot fige le nom au moment de la génération)
```

Les bases de dev existantes (avec des données legacy en string libre) doivent être réinitialisées (`pnpm db:reset` ou `docker compose down -v` puis `up --build`). Documenté dans le README. Acceptable car le projet est pré-production.

### D11. Adapter `IBarcodeResolver`

Le port existant attend `resolve(barcode): Promise<BarcodeResolution | null>` avec au minimum `{ name, defaultUnit? }`. On élargit le type retour pour inclure `ingredientId`, `productId`, `storage`, `category` :

```ts
export interface BarcodeResolution {
  name: string;
  defaultUnit?: CanonicalUnit;
  ingredientId?: string;      // nouveau
  productId?: string;         // nouveau
  storage?: 'pantry' | 'fridge'; // nouveau
  category?: IngredientCategory; // nouveau
}
```

Ces champs étant optionnels, la requirement existante « Barcode Resolution Port » reste satisfaite. L'adapter `IngredientBarcodeResolver` vit dans `server/contexts/ingredients/infrastructure/` et est branché par la composition root. Il prend `IProductRepository` en dépendance.

### D12. Seed initial comme prérequis dur

Une migration applicative : à chaque nouvelle `household` créée, `CreateHouseholdUseCase` appelle les `IHouseholdInitializer[]` qui lui sont injectés. Ingredients en fournit un : `SeedDefaultIngredientsInitializer` insère ~50 ingrédients FR de base.

Comme `ingredient_id` est obligatoire pour ajouter quoi que ce soit, **un foyer sans seed est inutilisable**. Le seed n'est plus optionnel. Conséquences :

- Le test d'intégration du seed devient critique (couverture obligatoire).
- Le formulaire d'inventaire/recette propose un autocomplete sur les ingrédients du foyer + un raccourci « + Nouvel ingrédient » (modale rapide) pour les cas où l'utilisateur veut quelque chose hors seed.
- Le script `db:seed-existing-households` (cf. D14) reste utile pour les bases de dev partagées entre développeurs.

**Cross-context :** `family` reçoit un port `IHouseholdInitializer` (interface dans `family/domain/ports/`). Ingredients fournit l'implémentation dans son `infrastructure/`. Aucun import direct cross-context.

Pas besoin de script de migration pour les foyers existants : la base est vide au moment où ce change est appliqué. Tout nouveau foyer (le premier inclus) sera seedé automatiquement par l'initializer.

Liste seed (catégorie, nom, storage, canonical_unit) :
- produce: tomate (g), oignon (g), ail (g), carotte (g), courgette (g), pomme de terre (g), salade (unit), poivron (g), citron (unit), pomme (g), banane (g)…
- dairy: lait (ml), beurre (g), œufs (unit), yaourt nature (g), crème fraîche (ml), fromage râpé (g)…
- bakery: pain (g), baguette (unit)…
- meat-fish: poulet (g), bœuf haché (g), saumon (g), thon en conserve (g)…
- grocery: pâtes (g), riz (g), farine (g), sucre (g), sel (g), poivre (g), huile d'olive (ml), vinaigre (ml), moutarde (g), tomate concassée (g), bouillon cube (unit)…
- beverages: eau (ml), jus d'orange (ml), café (g)…

(Liste finale précisée dans `tasks.md` à l'implémentation.)

### D13. Routes API

**Nouvelles :**
```
GET    /api/ingredients                  -- ?q=&category=&storage=&includeArchived=
POST   /api/ingredients
GET    /api/ingredients/:id
PATCH  /api/ingredients/:id
DELETE /api/ingredients/:id              -- soft si référencé, hard sinon

POST   /api/ingredients/:id/products
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id

GET    /api/barcodes/:code               -- 200 + { ingredient, product } | 404
```

**Modifiées (BREAKING) :**
```
POST/PATCH /api/inventory                -- ingredientId requis, name retiré
POST/PATCH /api/recipes                  -- chaque ingredient requiert ingredientId, name retiré
GET    /api/inventory                    -- chaque item expose ingredientId + name (résolu)
GET    /api/recipes/:id                  -- chaque ingredient expose ingredientId + name (résolu)
GET    /api/shopping-lists?menuId=...    -- chaque item expose ingredientId + category, tri par rayon
```

Toutes les routes passent par `requireHouseholdMember()`. Le contrôleur fait `event.context.container.<useCase>.execute(...)`.

### D14. Front

Pages **nouvelles** :
- `/ingredients` : tableau avec recherche live (debounce 200ms), filtres `storage` et `category`, bouton « Nouveau ». Tri par défaut : `category` puis `name`.
- `/ingredients/[id]` : détail, édition inline, panneau « Produits » listant les produits avec leurs codes-barres + bouton « Ajouter un produit » (formulaire avec champ code-barre simple).

Pages **modifiées** :
- `/inventory` : formulaire d'ajout remplace le champ « Nom » par un autocomplete `<USelectMenu>` sur les ingrédients du foyer. L'unité proposée est dérivée du `canonicalUnit` (avec liste des unités compatibles). Le `location` est pré-rempli depuis `ingredient.storage` mais reste éditable. Raccourci « + Nouvel ingrédient » ouvre une modale `IngredientFormModal` ; l'ingrédient créé est immédiatement sélectionné.
- `/recipes/[id]` (édition) : chaque ligne d'ingrédient utilise le même autocomplete + même raccourci.
- `/shopping` : la liste est groupée par rayon (titre de catégorie + items dessous), ordre fixe `produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other`.

Composables :
- `useApiIngredients` : `list(query)`, `get(id)`, `create(dto)`, `update(id, dto)`, `delete(id)`.
- `useApiProducts` : `addToIngredient(ingredientId, dto)`, `get(id)`, `update(id, dto)`, `delete(id)`, `resolveByBarcode(code)`.

Pas de page « scanner ». Le champ code-barre dans le formulaire produit est un simple `<input>` text/number. Le scan caméra est un futur change côté inventory.

## Risks / Trade-offs

| Risque | Mitigation |
|---|---|
| **Surcharge cognitive pour l'utilisateur** : deux concepts (ingrédient + produit) là où il en attend peut-être un seul. | UI v1 : on cache `Product` derrière une section « Produits / codes-barres » de la page ingrédient. L'utilisateur lambda gère des ingrédients ; les produits n'apparaissent que s'il veut scanner. |
| **Le seed plante** ⟶ foyer inutilisable. C'est désormais critique : aucun fallback string libre. | Le seed est transactionnel : si l'insertion échoue, la création du foyer est rollback. Test d'intégration obligatoire couvrant le succès et l'échec partiel. Le script `db:seed-existing-households` permet une réparation manuelle. |
| **Friction utilisateur** quand un ingrédient désiré n'est pas dans le seed. | Raccourci « + Nouvel ingrédient » dans les formulaires inventory/recipe (modale minimaliste, 4 champs : nom, storage, category, canonicalUnit). |
| **Seed dupliqué par foyer** : N foyers × ~50 lignes. À 10k foyers ça reste < 500k lignes, négligeable. | Aucune mitigation nécessaire en v1. |
| **Soft delete oublié dans les requêtes** : un repo qui ne filtre pas `deleted_at IS NULL` retourne des ingrédients archivés. | Filtre `deletedAt: null` factorisé dans une méthode `baseQuery()` du repository. Test d'intégration : créer/soft-delete/list ne retourne pas l'ingrédient. |
| **Validation checksum EAN trop stricte** : un code-barre vraiment scanné par l'utilisateur mais avec checksum erroné serait rejeté. | Logger les rejets en dev pour mesurer ; possibilité d'ajouter un mode `lax` plus tard si nécessaire. |
| **Renommer un ingrédient change les noms affichés dans les recettes / inventaire existants** (effet de bord du fait qu'on a drop la colonne `name` legacy). | C'est le comportement attendu (l'ingrédient *est* la source de vérité). Pour les snapshots de liste de courses, on dénormalise volontairement `name` au moment de la génération (le snapshot fige l'historique). |

## Migration Plan

Pas de migration de données — la base est vide au moment où ce change est appliqué. Uniquement schéma :

1. Générer la migration Drizzle (`pnpm db:generate`) qui :
   - Crée `ingredient`, `ingredient_alias`, `product`, `product_barcode`.
   - Ajoute `ingredient_id NOT NULL` + FK + INDEX sur `inventory_item`, `recipe_ingredient`, `shopping_list_item`.
   - Ajoute `category` sur `shopping_list_item`.
   - Drop les colonnes `name` sur `inventory_item` et `recipe_ingredient`.
2. Appliquer (`pnpm db:migrate`).
3. La logique de seed est applicative, pas SQL : elle se déclenche automatiquement à chaque création de foyer via `CreateHouseholdUseCase` + `SeedDefaultIngredientsInitializer`. Tout foyer créé après l'application de ce change est immédiatement utilisable.
4. Rollback : `drizzle-kit drop` sur la migration. Accepté en pré-production.

## Open Questions

Aucune — toutes les décisions structurantes sont actées ci-dessus (foyer-scoped, deux agrégats, `ingredient_id` obligatoire partout, drop des colonnes `name` legacy, soft-delete des ingrédients référencés, hard-delete des produits, seed via initializer transactionnel, format EAN/UPC avec checksum, location surchargeable par article).
