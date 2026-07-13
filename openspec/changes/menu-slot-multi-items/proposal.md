## Why

Aujourd'hui une case du menu (un couple jour + repas) ne peut référencer **qu'une seule recette**. Or beaucoup de repas réels sont un mélange : une recette principale *plus* des accompagnements bruts (pain, salade, yaourt…), ou parfois juste quelques ingrédients sans recette du tout. Le modèle actuel oblige soit à créer une « fausse » recette, soit à oublier ces ingrédients — qui disparaissent alors de la liste de courses.

## What Changes

- **BREAKING** : une case du menu n'est plus liée à *une* recette mais devient une **liste d'items**. Une case peut contenir au plus **une recette** ET **0..n ingrédients libres** (sans recette), combinables.
- Un **ingrédient libre** référence le catalogue d'ingrédients existant (`ingredientId`) et porte une quantité via le Value Object `Quantity` (unité canonique en base).
- La **liste de courses dérivée** intègre les ingrédients libres exactement comme les ingrédients de recettes : ajoutés au besoin total, agrégés par `(ingrédient, unité canonique)`, puis soustraits de l'inventaire.
- **BREAKING** : la clé primaire `menu_slots (menu_id, day_of_week, meal_type)` saute. Introduction d'une table d'items de slot (`menu_slot_items`) ; `menu_slots` ne porte plus `recipe_id`/`servings`.
- API d'assignation revue : on ajoute/retire des items dans une case plutôt que de remplacer une recette unique. DTOs `shared/dto/menus.ts` mis à jour.
- Front : la page menu et `MenuSlotPicker` affichent et éditent une liste mixte (recette + ingrédients) par case.

## Capabilities

### New Capabilities

(aucune — modifications de capacités existantes)

### Modified Capabilities

- `meal-planning` : la structure d'un slot change — un slot devient un conteneur d'items (≤ 1 recette + n ingrédients libres référençant le catalogue) ; les requirements « Menu Slot Structure », « Assigning a Recipe to a Slot », « Clearing a Slot » et « Cascade on Recipe Deletion » évoluent, et de nouveaux requirements couvrent l'ajout/retrait d'ingrédients libres.
- `shopping` : la génération de liste de courses agrège désormais les ingrédients de recettes **et** les ingrédients libres des slots (requirements « Shopping List Generation from a Menu » et « Aggregation Rules »).

## Impact

- **Domain meal-planning** : `MenuSlot` (entité) refactorée en conteneur d'items ; nouveaux value objects/entités `MenuSlotItem` (variantes recette / ingrédient libre).
- **DB** : nouvelle table `menu_slot_items` + migration de données depuis `menu_slots` ; `server/database/schema/menus.ts`.
- **Use cases** : assignation recette → ajout/retrait d'items ; `server/contexts/meal-planning/application/use-cases/*`.
- **Shopping** : `GenerateShoppingListUseCase` + port `RecipeSnapshotFinder` / nouvel accès aux ingrédients libres du menu.
- **DTOs** : `shared/dto/menus.ts` (schémas slot/item, endpoints d'assignation).
- **Front** : `app/pages/menu/index.vue`, `app/components/MenuSlotPicker.vue`, composables `useApiMenu*`.
- **Tests** : unit (nouveaux VO/entités), integration (use cases meal-planning + génération shopping avec ingrédients libres).
