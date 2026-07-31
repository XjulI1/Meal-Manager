## 1. Domaine meal-planning

- [x] 1.1 Créer le value object / union `MenuSlotItem` (`RecipeSlotItem` + `IngredientSlotItem`) dans `server/contexts/meal-planning/domain/`
- [x] 1.2 Refactorer `MenuSlot` (entité/VO) en conteneur d'items avec invariant « au plus une recette » + accesseurs `recipeItem()` / `ingredientItems()`
- [x] 1.3 Ajouter l'erreur métier `MultipleRecipesInSlotError` dans `domain/errors/`
- [x] 1.4 Implémenter la somme d'un ingrédient libre déjà présent (même `ingredientId` + unité) via `Quantity.add` au niveau domaine
- [x] 1.5 Tests unitaires : invariant recette unique, somme d'ingrédients, slot vide

## 2. Base de données

- [x] 2.1 Remplacer `menu_slots` par `menu_slot_items` dans `server/database/schema/menus.ts` (colonnes D1 : `id`, `menu_id`, `day_of_week`, `meal_type`, `kind`, `recipe_id` FK `CASCADE`, `servings`, `ingredient_id` FK `CASCADE`, `quantity_value`, `quantity_unit`)
- [x] 2.2 Ajouter index `(menu_id, day_of_week, meal_type)` + unique `(menu_id, day_of_week, meal_type, ingredient_id)`
- [x] 2.3 `pnpm db:generate` puis éditer la migration : copie des slots recette existants en items `kind='recipe'` (UUID app) **avant** le drop de `menu_slots`
- [x] 2.4 Écrire la migration down (recrée `menu_slots`, recopie items `kind='recipe'`)

## 3. Infrastructure meal-planning

- [x] 3.1 Mettre à jour `menu.mapper.ts` : rows `menu_slot_items` → regroupement par `(day, meal)` en `MenuSlot` avec items typés
- [x] 3.2 Mettre à jour le repository meal-planning (lecture/écriture par items, suppression d'item, vidage de case, suppression des lignes orphelines)

## 4. Use cases meal-planning

- [x] 4.1 `AddSlotItemUseCase` : ajout recette (remplace l'item recette) ou ingrédient (vérif foyer, `Quantity.fromUserInput`, somme si doublon)
- [x] 4.2 `RemoveSlotItemUseCase` : retrait d'un item par `itemId`, slot disparaît si vide
- [x] 4.3 `ClearSlotUseCase` : vider une case `(day, meal)`
- [x] 4.4 Enregistrer/ajuster les use cases dans `server/plugins/container.ts`
- [x] 4.5 Tests d'intégration (repos en mémoire) : add recette+ingrédients mélangés, remplacement recette en gardant ingrédients, somme, remove, clear, isolation foyer, unité incompatible

## 5. DTO & endpoints HTTP

- [x] 5.1 `shared/dto/menus.ts` : `MenuSlotItemViewSchema` (discriminé), `MenuSlotViewSchema` (items), `AddSlotItemSchema` (union recette/ingrédient) ; retirer `AssignRecipeToSlotSchema`
- [x] 5.2 `POST /api/menus/:menuId/slots/items` (ajout item) via container + `requireHouseholdMember()`
- [x] 5.3 `DELETE /api/menus/:menuId/slots/items/:itemId` (retrait item)
- [x] 5.4 `DELETE /api/menus/:menuId/slots?dayOfWeek&mealType` (vidage case) aligné sur le nouveau modèle
- [x] 5.5 Mapper `IncompatibleUnitsError` → HTTP 400 à la frontière
- [x] 5.6 Smoke tests HTTP (ajout/suppression item, 400 unité, 404 foyer)

## 6. Shopping (liste de courses)

- [x] 6.1 `GenerateShoppingListUseCase` : itérer `slots[].items`, pousser les items recette (scale existant) et les items ingrédient libre (quantité canonique, sans scale) dans `ShoppingListBuilder`
- [x] 6.2 Résoudre `name`/`category` des ingrédients libres au moment de la génération
- [x] 6.3 Tests d'intégration : ingrédient libre seul contribue, somme recette+ingrédient libre, soustraction inventaire inchangée

## 7. Front

- [x] 7.1 `MenuSlotPicker.vue` : édition d'une liste mixte (recette + portions optionnelle, ingrédients libres avec autocomplete catalogue + quantité/unité, ajout/suppression)
- [x] 7.2 `app/pages/menu/index.vue` : affichage recette + ingrédients libres par case
- [x] 7.3 Composables `useApiMenu*` alignés sur les nouveaux endpoints/DTO

## 8. Validation finale

- [x] 8.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 8.2 `openspec validate menu-slot-multi-items --strict` (validé "valid" en début de session ; aucun fichier proposal/design/specs modifié depuis)
- [ ] 8.3 Vérification manuelle migration sur un dump local (slots recette → items, drop OK) — **reportée avant déploiement**, pas d'instance MariaDB dans cet environnement
