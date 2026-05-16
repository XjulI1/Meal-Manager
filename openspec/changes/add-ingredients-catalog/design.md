# Design: Base de connaissance d'ingrédients et produits

## Context

Le change initial (`init-meal-manager`) a livré un MVP où l'inventaire, les recettes et la liste de courses référencent les ingrédients par chaîne libre. `ShoppingListBuilder` agrège sur `(name.trim().lowercase(), unité canonique)`. Cette approche fonctionnelle est volontairement simpliste et identifiée comme à remplacer dès qu'on veut :

- Scanner un code-barre pour ajouter un article (le port `IBarcodeResolver` existe déjà dans `inventory/domain/ports/` mais sans adapter).
- Trier la liste de courses par rayon en magasin.
- Désambiguïser orthographes/synonymes (« tomate cerise » vs « tomates cerises »).
- Filtrer les recettes par allergène ou régime.
- Pré-remplir l'inventaire avec le stockage (frais/placard) sans demander à l'utilisateur.

Ce change introduit le bounded context `ingredients` qui sert de **socle partagé** entre `inventory`, `catalog` et `shopping`. Il est conçu pour être adopté **progressivement** : les anciennes lignes string libre continuent de fonctionner ; les nouvelles peuvent référencer un `ingredient_id`.

## Goals / Non-Goals

**Goals :**
- Fournir un agrégat `Ingredient` (générique) et un agrégat `Product` (achetable) bien séparés, avec une relation 1..N claire.
- Implémenter le port `IBarcodeResolver` déjà déclaré dans `inventory`, sans casser la requirement « port presence » existante.
- Pouvoir scanner un code-barre et obtenir `{ ingredient, product }` (le client décide ensuite quoi en faire).
- Garder le domaine isolé : aucune dépendance Drizzle/mysql2/h3/Vue dans `server/contexts/ingredients/domain/**` (règle ESLint déjà active).
- Permettre une recherche par nom + alias (`useApiIngredients`) avec filtres rayon et storage.
- Livrer un seed d'ingrédients FR courants par foyer pour démarrer.
- Ne **pas** casser les routes existantes : `ingredientId` est optionnel dans les payloads create/update de `inventory_item` et `recipe_ingredient`.

**Non-Goals :**
- Migration automatique des chaînes libres vers `ingredient_id` (heuristique trim/lowercase + alias) — futur change.
- Scan caméra dans le front (sera une feature inventory plus tard, avec une lib type `zxing-js`).
- Import OpenFoodFacts ou autre base externe — sera un adapter alternatif d'`IBarcodeResolver` plus tard.
- Prix par produit, historique, comparateur.
- Catalogue partagé inter-foyers (forte tentation, mais ouvre une boîte de Pandore RGPD/modération — repoussé).
- Champ « stock minimum / par défaut » par ingrédient (pourrait alimenter une auto-suggestion liste de courses, hors scope).

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

### D3. Stockage (`pantry`/`fridge`) sur l'ingrédient

**Décision :** `Ingredient.storage` est `'pantry' | 'fridge'`. Au scan d'un code-barre, on remonte au `Product` puis à son `Ingredient`, et on pré-remplit l'inventaire avec le bon `location`.

**Alternative :** mettre `storage` sur le produit (un même ingrédient peut techniquement se garder au frigo OU au placard selon le format — ex: tomates en conserve vs tomates fraîches). Rejetée : si deux formats divergent vraiment sur le stockage, ce sont deux ingrédients distincts (« tomates fraîches » vs « tomates concassées »).

### D4. Catégorie (rayon) en enum borné

**Décision :** `IngredientCategory` est un enum fermé :
`produce | dairy | bakery | meat-fish | frozen | grocery | beverages | household | other`

**Raison :** suffisant pour trier la liste de courses par rayon. Étendre l'enum plus tard est trivial (ajouter une valeur, migration `mysqlEnum`). Une string libre ouvrirait la porte à des typos et casserait le tri.

### D5. Allergènes : enum des 14 EU

**Décision :** `Allergen` enum sur les 14 allergènes EU réglementaires :
`gluten | crustaceans | eggs | fish | peanuts | soy | milk | nuts | celery | mustard | sesame | sulphites | lupin | molluscs`

Stocké comme **set** (table de jointure `ingredient_allergen` ou colonne JSON — voir D9).

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

### D9. Schéma DB

```
ingredient
  id             char(36) PK
  household_id   char(36) FK -> household.id, INDEX
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
  UNIQUE(household_id, name) WHERE deleted_at IS NULL  -- index unique partiel (MariaDB: index sur (household_id, name, deleted_at))

ingredient_alias
  id             char(36) PK
  ingredient_id  char(36) FK -> ingredient.id ON DELETE CASCADE
  alias          varchar(100) NOT NULL
  UNIQUE(ingredient_id, alias)
  INDEX(alias)   -- pour recherche

product
  id             char(36) PK
  household_id   char(36) FK -> household.id, INDEX
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
  barcode        varchar(14) NOT NULL
  UNIQUE(<household_id-via-product>, barcode)  -- via colonne dénormalisée household_id
  household_id   char(36) NOT NULL   -- dénormalisé pour permettre l'index unique
  INDEX(barcode)
```

Note : l'index unique sur `product_barcode (household_id, barcode)` nécessite la dénormalisation de `household_id`. Le repository garantit la cohérence (toujours = product.household_id).

**Allergènes en JSON vs table de jointure :** JSON suffit en v1 (lecture exclusive depuis l'ingrédient, pas de requête « recettes sans gluten » dans ce change). Si plus tard on veut filtrer/indexer, on extrait dans une table.

### D10. Modifications des tables existantes

Trois colonnes ajoutées, toutes **nullables** :

```
inventory_item:      ADD COLUMN ingredient_id char(36) NULL, ADD FK + INDEX
recipe_ingredient:   ADD COLUMN ingredient_id char(36) NULL, ADD FK + INDEX
shopping_list_item:  ADD COLUMN ingredient_id char(36) NULL, ADD INDEX
```

Aucune contrainte `NOT NULL` ni migration de données — les lignes existantes restent en string libre. C'est explicitement le seul mode supporté en v1 (mode mixte : nouvelles entrées peuvent référencer ; anciennes restent).

### D11. Adapter `IBarcodeResolver`

Le port existant attend `resolve(barcode): Promise<BarcodeResolution | null>` avec au minimum `{ name, defaultUnit? }`. On élargit le type retour pour inclure `ingredientId` et `productId` :

```ts
export interface BarcodeResolution {
  name: string;
  defaultUnit?: CanonicalUnit;
  ingredientId?: string;      // nouveau
  productId?: string;         // nouveau
  storage?: 'pantry' | 'fridge'; // nouveau (utile pour pré-remplir)
}
```

Ces champs étant optionnels, la requirement existante « Barcode Resolution Port » reste satisfaite. L'adapter `IngredientBarcodeResolver` vit dans `server/contexts/ingredients/infrastructure/` et est branché par la composition root. Il prend `IProductRepository` en dépendance.

### D12. Seed initial

Une migration Drizzle dédiée `seed_ingredients_per_household.ts` : à chaque nouvelle `household` créée, un trigger applicatif (dans `CreateHouseholdUseCase` du contexte `family`) appelle `SeedDefaultIngredientsUseCase` pour insérer ~50 ingrédients FR courants. Pas de seed des produits/codes-barres (les utilisateurs scannent leurs propres marques).

**Alternative :** seed via SQL `INSERT` direct dans la migration. Rejetée — les foyers existants ne seraient pas seedés. Avec un use case, on peut aussi le déclencher depuis l'admin si besoin.

Liste seed (catégorie, nom, storage, canonical_unit) :
- produce: tomate (g), oignon (g), ail (g), carotte (g), courgette (g), pomme de terre (g), salade (unit), poivron (g), citron (unit), pomme (g), banane (g)…
- dairy: lait (ml), beurre (g), œufs (unit), yaourt nature (g), crème fraîche (ml), fromage râpé (g)…
- bakery: pain (g), baguette (unit)…
- meat-fish: poulet (g), bœuf haché (g), saumon (g), thon en conserve (g)…
- grocery: pâtes (g), riz (g), farine (g), sucre (g), sel (g), poivre (g), huile d'olive (ml), vinaigre (ml), moutarde (g), tomate concassée (g), bouillon cube (unit)…
- beverages: eau (ml), jus d'orange (ml), café (g)…

(Liste finale précisée dans `tasks.md` à l'implémentation.)

### D13. Routes API

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

Toutes les routes passent par `requireHouseholdMember()`. Le contrôleur ne sait rien des use cases au-delà de leur signature ; il fait `event.context.container.<useCase>.execute(...)`.

### D14. Front

Pages :
- `/ingredients` : tableau avec recherche live (debounce 200ms), filtres `storage` et `category`, bouton « Nouveau ». Tri par défaut : `category` puis `name`.
- `/ingredients/[id]` : détail, édition inline, panneau « Produits » listant les produits avec leurs codes-barres + bouton « Ajouter un produit » (formulaire avec champ code-barre simple).

Composables :
- `useApiIngredients` : `list(query)`, `get(id)`, `create(dto)`, `update(id, dto)`, `delete(id)`.
- `useApiProducts` : `addToIngredient(ingredientId, dto)`, `get(id)`, `update(id, dto)`, `delete(id)`, `resolveByBarcode(code)`.

Pas de page « scanner ». Le champ code-barre dans le formulaire produit est un simple `<input>` text/number. Le scan caméra est un futur change côté inventory.

## Risks / Trade-offs

| Risque | Mitigation |
|---|---|
| **Surcharge cognitive pour l'utilisateur** : deux concepts (ingrédient + produit) là où il en attend peut-être un seul. | UI v1 : on cache `Product` derrière une section « Produits / codes-barres » de la page ingrédient. L'utilisateur lambda gère des ingrédients ; les produits n'apparaissent que s'il veut scanner. |
| **Mode mixte string + ingredientId** dans inventory/recipes/shopping : risque de bugs d'agrégation (un même article comptabilisé deux fois). | `ShoppingListBuilder` agrège d'abord par `ingredient_id` quand présent, puis par `(name.lower, unit)` pour le reste. Documenté dans le delta `shopping/spec.md`. Test d'intégration dédié. |
| **Seed dupliqué par foyer** : N foyers × ~50 lignes. À 10k foyers ça reste < 500k lignes, négligeable. | Aucune mitigation nécessaire en v1. |
| **Soft delete oublié dans les requêtes** : un repo qui ne filtre pas `deleted_at IS NULL` retourne des ingrédients archivés. | Filtre `deletedAt: null` factorisé dans une méthode `baseQuery()` du repository. Test d'intégration : créer/soft-delete/list ne retourne pas l'ingrédient. |
| **Validation checksum EAN trop stricte** : un code-barre vraiment scanné par l'utilisateur mais avec checksum erroné serait rejeté. | Logger les rejets en dev pour mesurer ; possibilité d'ajouter un mode `lax` plus tard si nécessaire. |
| **Conflit FK lors d'un `DELETE household`** : ingredients / products référencent household. | `ON DELETE CASCADE` sur `household_id` partout (cohérent avec les autres tables foyer-scoped). |
| **Boucle d'instanciation seed** : `CreateHouseholdUseCase` (family) doit appeler `SeedDefaultIngredientsUseCase` (ingredients), créant un couplage cross-context. | Famille reçoit un port `IHouseholdInitializer[]` (liste d'initializers) via la composition root. Ingredients fournit un `SeedDefaultIngredientsInitializer` qui implémente ce port. Pas d'import direct cross-context. |

## Migration Plan

Pas de migration de données à proprement parler — uniquement schéma :

1. Générer la migration Drizzle (`pnpm db:generate`) qui :
   - Crée `ingredient`, `ingredient_alias`, `product`, `product_barcode`.
   - Ajoute `ingredient_id` (nullable) sur `inventory_item`, `recipe_ingredient`, `shopping_list_item`.
2. La migration de seed n'est **pas** une migration SQL — elle est déclenchée applicativement à la création d'un foyer (via l'initializer).
3. Pour les foyers **déjà existants** : un script utilitaire `pnpm db:seed-existing-households` (one-shot dans `scripts/`) parcourt les foyers sans aucun ingrédient et déclenche le seed pour chacun. Documenté dans le README.
4. Rollback : `drizzle-kit drop` sur la migration. Les colonnes nullables ajoutées n'ont pas de données, donc le rollback est trivial. Si un foyer a déjà créé des ingrédients, le rollback supprime ces données — accepté en v1 pré-production.

## Open Questions

Aucune — toutes les décisions structurantes sont actées ci-dessus (foyer-scoped, deux agrégats, soft-delete des ingrédients, hard-delete des produits, seed via initializer, format EAN/UPC avec checksum).
