## Why

Le transport MCP expose aujourd'hui 11 outils dont un seul écrit (`mealmanager_save_recipe_draft`). Un agent LLM peut lire l'inventaire et le catalogue d'ingrédients, mais ne peut **ni créer un ingrédient ni ranger un article** dans le placard, le frigo ou le congélateur. Or ce sont les deux gestes de saisie les plus fréquents au quotidien (« j'ai acheté X, ajoute-le »). Les use cases métier existent déjà (`createIngredient`, `addInventoryItem`) ; il ne manque que la surface MCP.

## What Changes

- Ajout de l'outil MCP **`mealmanager_create_ingredient`** (write) : crée un ingrédient dans le catalogue du foyer avec les champs minimaux `name`, `category`, `canonicalUnit`, `storage`. Délègue au use case existant `createIngredient`. Retourne la vue de l'ingrédient créé (dont son `id`).
- Ajout de l'outil MCP **`mealmanager_add_inventory_item`** (write) : ajoute/incrémente un article dans l'inventaire (sémantique upsert du use case `addInventoryItem`). Entrée : `ingredientId` (UUID requis), `quantity` `{ value, unit }`, et `location` parmi `pantry` / `fridge` / `freezer` (Placard / Frigo / Congélateur, optionnel). Retourne `{ item, created }`.
- Les deux outils **n'acceptent jamais `householdId`** en entrée — il est injecté depuis le PAT authentifié, comme les autres outils.
- Le catalogue MCP passe de **11 à 13 outils**. Mise à jour du document OpenAPI servi à `/openapi-mcp.yaml` (liste des `operationId` + `x-mcp-tool`) et des tests smoke qui assertent le nombre et la composition des outils.

## Capabilities

### New Capabilities
<!-- Aucune nouvelle capability : on étend le transport MCP existant. -->

### Modified Capabilities
- `mcp`: le catalogue d'outils MCP gagne deux outils d'écriture (`mealmanager_create_ingredient`, `mealmanager_add_inventory_item`) ; le compte passe de 11 à 13 et le document OpenAPI doit les déclarer.

## Impact

- **Code** : `server/routes/mcp/tools/ingredients.ts` (+1 outil), `server/routes/mcp/tools/inventory.ts` (+1 outil), générateur OpenAPI sous `server/routes/openapi-mcp.yaml*` / well-known catalog le cas échéant.
- **Use cases / DB** : aucun nouveau use case, aucune migration. `createIngredient` et `addInventoryItem` sont déjà câblés dans `server/plugins/container.ts`.
- **DTO** : réutilise `CreateIngredientSchema` / `CreateInventoryItemSchema` de `shared/dto/` (champs minimaux pour la création d'ingrédient).
- **Tests** : `tests/integration/http/` (smoke MCP : compte d'outils 11 → 13, nouveaux scénarios write + isolation foyer + rejet de `householdId` en entrée).
- **Sécurité** : deux nouveaux points d'écriture, tous deux scoped au foyer du PAT via la même garde que les outils existants.
