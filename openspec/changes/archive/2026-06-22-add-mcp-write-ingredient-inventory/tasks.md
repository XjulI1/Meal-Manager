## 1. Outil MCP — create_ingredient

- [x] 1.1 Dans `server/routes/mcp/tools/ingredients.ts`, enregistrer `mealmanager_create_ingredient` (write) avec `inputSchema` minimal : `name`, `category` (`IngredientCategorySchema`), `canonicalUnit` (`CanonicalUnitSchema`), `storage` (`IngredientStorageSchema`) — pas de `householdId`, pas de champs avancés. Déléguer à `ctx.container.createIngredient.execute({ householdId: ctx.householdId, ... })` et retourner la vue via `jsonContent`.
- [x] 1.2 Catcher l'erreur métier de nom dupliqué (et toute erreur de validation domaine attendue) et la renvoyer en résultat MCP `isError: true` avec le message, à l'image de `mealmanager_save_recipe_draft`. Laisser remonter les autres erreurs.

## 2. Outil MCP — add_inventory_item

- [x] 2.1 Dans `server/routes/mcp/tools/inventory.ts`, enregistrer `mealmanager_add_inventory_item` (write) avec `inputSchema` : `ingredientId` (UUID requis), `quantity` (`{ value, unit }`), `location` (`StorageLocationSchema` optionnel : `pantry`/`fridge`/`freezer`). Déléguer à `ctx.container.addInventoryItem.execute({ householdId: ctx.householdId, ... })` et retourner `{ item, created }` via `jsonContent`.
- [x] 2.2 Catcher les erreurs métier attendues (ingrédient introuvable / hors foyer, unité incompatible avec la dimension de l'ingrédient) et les renvoyer en résultat MCP `isError: true`. Mettre à jour la description de `mealmanager_list_inventory` si elle ne mentionne que placard + frigo, pour inclure le congélateur.

## 3. Documents de découvrabilité

- [x] 3.1 `public/openapi-mcp.yaml` : ajouter les deux opérations `mealmanager_create_ingredient` et `mealmanager_add_inventory_item` (path operations + `operationId` + extension `x-mcp-tool` portant l'input schema), en respectant la contrainte « pas de `householdId` dans l'input ».
- [x] 3.2 `public/llms.txt` : remplacer « Eleven tools » par « Thirteen tools » et mentionner les nouveaux outils d'écriture (création d'ingrédient + ajout à l'inventaire).
- [x] 3.3 `public/llms-full.txt` : ajouter les deux outils au tableau/description des outils et corriger tout décompte.

## 4. Tests

- [x] 4.1 `tests/integration/http/mcp-route.test.ts` : passer l'assertion de catalogue de 11 à 13 outils et ajouter `mealmanager_create_ingredient` + `mealmanager_add_inventory_item` à la liste triée attendue.
- [x] 4.2 `tests/integration/http/mcp-route.test.ts` : ajouter les scénarios write — `create_ingredient` câble `createIngredient` avec `householdId` du PAT et ignore un `householdId` fourni ; `add_inventory_item` câble `addInventoryItem` (created=true nouvelle ligne, created=false upsert), supporte `freezer`, et renvoie un résultat d'erreur sur `ingredientId` inconnu/hors foyer.
- [x] 4.3 `tests/integration/http/agent-discoverability.test.ts` : passer l'assertion « lists exactly the 11 mealmanager_* operationIds » à 13 et ajouter les deux nouveaux `operationId` à la liste triée.

## 5. Validation

- [x] 5.1 `pnpm exec openspec validate add-mcp-write-ingredient-inventory --strict` passe.
- [x] 5.2 `pnpm test`, `pnpm lint` et `pnpm typecheck` passent.
