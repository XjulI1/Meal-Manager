## Context

Une case du menu (`MenuSlot`) est aujourd'hui un couple `(dayOfWeek, mealType)` portant **une** recette + un nombre de portions, matérialisé par une ligne `menu_slots` dont la clé primaire est `(menu_id, day_of_week, meal_type)`. La table porte directement `recipe_id` (FK `ON DELETE SET NULL`) et `servings`. Le mapper (`menu.mapper.ts`) ne hydrate que les lignes dont `recipe_id`/`servings` sont non nuls. La génération de liste de courses (`GenerateShoppingListUseCase`) n'itère que des recettes via `RecipeSnapshotFinder`.

Le besoin : une case doit pouvoir mélanger **≤ 1 recette** et **0..n ingrédients libres** référençant le catalogue (`ingredientId` + `Quantity`), et ces ingrédients libres doivent alimenter la liste de courses comme ceux des recettes.

Contraintes du repo : architecture hexagonale par contexte, domaine sans I/O, unités via le VO `Quantity` (stockage canonique `g`/`ml`/`unit`), `mysqlEnum('quantity_unit', ['g','ml','unit'])`, IDs `char(36)` générés côté app.

## Goals / Non-Goals

**Goals:**
- Une case = conteneur d'items hétérogènes (recette + ingrédients libres) avec l'invariant « au plus une recette par case ».
- Les ingrédients libres référencent le catalogue et transitent par `Quantity` (validation de dimension, stockage canonique).
- La liste de courses agrège recettes + ingrédients libres par `(ingredientId, unité canonique)`, soustraction inventaire inchangée.
- Migration de données sans perte : chaque slot recette existant devient un item recette.

**Non-Goals:**
- Pas de plusieurs recettes par case (explicitement ≤ 1 — décidé avec l'utilisateur).
- Pas d'ingrédient en texte libre hors catalogue (toujours un `ingredientId`).
- Pas de nouveau type de repas (`snack`…), ni d'évolution de l'algorithme inventaire/soustraction.
- Pas d'implémentation de `IMenuSuggester`.

## Decisions

### D1 — Modèle DB : une seule table `menu_slot_items`, le « slot » devient logique
On **supprime** `menu_slots` et on introduit `menu_slot_items` :

| Colonne | Type | Notes |
|---|---|---|
| `id` | `char(36)` | PK (UUID app) |
| `menu_id` | `char(36)` | FK `menus` `ON DELETE CASCADE` |
| `day_of_week` | `mysqlEnum(...)` | `monday..sunday` |
| `meal_type` | `mysqlEnum('breakfast','lunch','dinner')` | |
| `kind` | `mysqlEnum('recipe','ingredient')` | discriminant |
| `recipe_id` | `char(36)` null | FK `recipes` **`ON DELETE CASCADE`** (kind=recipe) |
| `servings` | `int unsigned` null | (kind=recipe) |
| `ingredient_id` | `char(36)` null | FK `ingredients` `ON DELETE CASCADE` (kind=ingredient) |
| `quantity_value` | `int unsigned` null | (kind=ingredient) canonique |
| `quantity_unit` | `mysqlEnum('g','ml','unit')` null | (kind=ingredient) |

Index : `index(menu_id, day_of_week, meal_type)` pour regrouper une case ; `unique(menu_id, day_of_week, meal_type, ingredient_id)` comme garde-fou anti-doublon ingrédient (les lignes recette ont `ingredient_id = NULL`, et MariaDB autorise plusieurs NULL → n'impacte pas les recettes).

**Pourquoi pas une table `menu_slots` + table d'items ?** Un slot sans surrogate id imposerait une FK composite large `(menu_id, day, meal)` sur les items, et il faudrait gérer la création/suppression de la ligne slot vide. Avec une table unique, « un slot existe ⇔ il a au moins un item » tombe naturellement (exigence spec : pas de slot vide persisté). Le regroupement par case se fait au mapping.

**Pourquoi `recipe_id ON DELETE CASCADE` (et plus `SET NULL`) ?** Comme chaque item est une ligne, la suppression d'une recette supprime **uniquement** la ligne item recette ; les lignes ingrédients de la même case (lignes distinctes) survivent. C'est exactement l'exigence « Cascade on Recipe Deletion » nouvelle version, sans logique applicative dédiée et sans ligne orpheline `recipe_id = NULL`.

### D2 — Domaine : `MenuSlot` = conteneur, `MenuSlotItem` discriminé
- `MenuSlotItem` en union : `RecipeSlotItem { id, kind:'recipe', recipeId, servings }` et `IngredientSlotItem { id, kind:'ingredient', ingredientId, quantity: Quantity }`.
- `MenuSlot` (value object) : `{ dayOfWeek, mealType, items: ReadonlyArray<MenuSlotItem> }`, invariant **au plus un item recette** vérifié à la construction (sinon erreur métier `MultipleRecipesInSlotError`). Accesseurs `recipeItem()`, `ingredientItems()`.
- `Menu` inchangé en surface : `slots: ReadonlyArray<MenuSlot>`, mais un slot agrège désormais des items.
- L'ajout d'un ingrédient déjà présent (même `ingredientId` + même unité canonique) **somme** les quantités via `Quantity.add` (exigence spec), au niveau domaine.

### D3 — Use cases : Add / Remove / Clear
Remplacer la sémantique « assigner une recette » par des opérations d'items :
- `AddSlotItemUseCase` — gère `kind:'recipe'` (remplace l'item recette existant, garde les ingrédients) et `kind:'ingredient'` (vérifie l'ingrédient du foyer, `Quantity.fromUserInput` → dimension validée, somme si doublon).
- `RemoveSlotItemUseCase` — retire un item par `itemId` ; si la case devient vide, plus aucune ligne (slot disparaît).
- `ClearSlotUseCase` — supprime tous les items d'une case `(day, meal)`.

L'ancien `AssignRecipeToSlotUseCase` est absorbé par `AddSlotItemUseCase` (kind recipe). Validation foyer via `requireHouseholdMember()` / container DI inchangée.

### D4 — DTOs (`shared/dto/menus.ts`)
- `MenuSlotItemViewSchema` discriminé sur `kind` (recipe → `{ id, kind, recipeId, servings }` ; ingredient → `{ id, kind, ingredientId, quantity: { value, unit } }`).
- `MenuSlotViewSchema` : `{ dayOfWeek, mealType, items: MenuSlotItemView[] }`.
- Entrée `AddSlotItemSchema` (union discriminée recette/ingrédient) ; suppression par `itemId`. `AssignRecipeToSlotSchema` retiré (BREAKING).

### D5 — Endpoints HTTP
- `POST /api/menus/:menuId/slots/items` — ajoute un item (recette ou ingrédient).
- `DELETE /api/menus/:menuId/slots/items/:itemId` — retire un item.
- `DELETE /api/menus/:menuId/slots?dayOfWeek&mealType` — vide une case (conservé).
- `GET /api/menus` renvoie le nouveau `MenuView` (slots → items).

### D6 — Shopping : agrège recettes + ingrédients libres
`GenerateShoppingListUseCase` lit déjà le menu (entité de domaine) ; il itère désormais sur les `slots[].items` :
- item recette → comportement actuel (scale `servings / recipe.servings` via `RecipeSnapshotFinder`).
- item ingrédient → pousse directement `(ingredientId, quantity)` (déjà canonique, pas de scale) dans `ShoppingListBuilder`.
Le builder agrège déjà par `(ingredientId, unité)` puis soustrait l'inventaire — aucun changement de l'algo d'agrégation/soustraction. Il faut résoudre `name`/`category` des ingrédients libres au moment de la génération (déjà fait pour les ingrédients de recettes via le finder d'ingrédients).

### D7 — Front
- `MenuSlotPicker.vue` : édite une liste mixte — un sélecteur de recette (+ portions) optionnel et une liste d'ingrédients (autocomplete catalogue + quantité/unité), ajout/suppression d'items.
- `app/pages/menu/index.vue` : chaque case affiche la recette (si présente) puis les ingrédients libres.
- Composables `useApiMenu*` alignés sur les nouveaux endpoints/DTO.

## Risks / Trade-offs

- **Invariant « ≤ 1 recette » non garanti par la DB** → vérifié dans le domaine (`MenuSlot`) et dans `AddSlotItemUseCase` (remplacement). Test d'intégration dédié.
- **Changement `SET NULL` → `CASCADE` sur `recipe_id`** modifie le comportement de suppression de recette → couvert par l'exigence modifiée + scénario ; migration recrée la FK.
- **Migration de données** (slots → items recette) : ligne par ligne, `id` UUID généré. Risque de perte si script incorrect → migration testée en local sur dump avant déploiement ; rollback = restauration `menu_slots` (cf. plan).
- **Unité incompatible** pour un ingrédient libre → `Quantity.fromUserInput` lève `IncompatibleUnitsError`, mappé en HTTP 400 à la frontière.
- **BREAKING DTO/API** : les clients (front) doivent migrer en même temps que le back — livré dans la même PR/change.

## Migration Plan

1. `pnpm db:generate` après modif des schémas Drizzle (nouvelle table `menu_slot_items`, drop `menu_slots`).
2. Éditer la migration générée pour insérer une étape de **copie de données** : `INSERT INTO menu_slot_items (id, menu_id, day_of_week, meal_type, kind, recipe_id, servings) SELECT <uuid>, menu_id, day_of_week, meal_type, 'recipe', recipe_id, servings FROM menu_slots WHERE recipe_id IS NOT NULL` (génération d'UUID : soit côté SQL si dispo, soit script de migration applicatif), **avant** le `DROP TABLE menu_slots`.
3. Appliquer `pnpm db:migrate` en local, vérifier l'intégrité, puis déployer.
4. **Rollback** : la migration down recrée `menu_slots` et recopie les items `kind='recipe'` ; les items `kind='ingredient'` seraient perdus au rollback (acceptable — fonctionnalité non encore exploitée en prod au moment du premier déploiement).

## Open Questions

- Génération des UUID d'items lors de la copie SQL : préférer un petit script de migration applicatif (cohérent avec « UUID générés côté application ») ou tolérer `UUID()` MariaDB pour cette migration ponctuelle ? (proposé : script applicatif).
- Suppression d'item : par `itemId` (retenu) — confirmer que le front dispose bien de l'`id` d'item dans le `MenuView` (oui, ajouté au DTO).
