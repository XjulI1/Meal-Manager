## Context

Le transport MCP (`server/routes/mcp/`) est un adapter d'entrée stateless qui réutilise les use cases via `event.context.container`. Il enregistre aujourd'hui 11 outils via `registerAllTools` (`server/routes/mcp/tools/index.ts`), tous prefixés `mealmanager_`, et n'expose qu'un seul outil d'écriture (`mealmanager_save_recipe_draft`). L'auth se fait par PAT (`requireHouseholdFromPAT`) et le `householdId` n'est jamais accepté en entrée d'outil.

Les deux gestes demandés — créer un ingrédient, ranger un article dans Placard/Frigo/Congélateur — sont déjà couverts par des use cases métier câblés dans le container : `createIngredient` (`CreateIngredientUseCase`) et `addInventoryItem` (`AddInventoryItemUseCase`, sémantique upsert sur `(householdId, ingredientId, location)`). Le `StorageLocation` VO supporte déjà `pantry` / `fridge` / `freezer`.

Contrainte structurante : le spec `mcp` fige le **compte exact d'outils** (« exactly 11 tools ») dans trois requirements (HTTP Endpoint, Tool Catalog, OpenAPI) et les tests smoke l'assertent. Toute addition d'outil doit donc mettre ces trois points à jour de façon cohérente.

## Goals / Non-Goals

**Goals:**
- Exposer `createIngredient` et `addInventoryItem` comme deux outils MCP d'écriture, scoped au foyer du PAT.
- Garder la surface d'entrée minimale et conforme au pattern existant (`jsonContent`, pas de `householdId`).
- Maintenir la cohérence du catalogue : 13 outils dans le code, l'OpenAPI et les tests.

**Non-Goals:**
- Pas de nouvel use case, pas de migration DB, pas de changement de domaine.
- Pas d'auto-résolution d'ingrédient par nom dans `add_inventory_item` (l'agent fournit un `ingredientId` obtenu via `list_ingredients`/`create_ingredient`). Découplage volontaire des deux capacités.
- Pas d'exposition des champs avancés de l'ingrédient (aliases, allergens, shelfLife, imageUrl, defaultPackSize) — restent éditables via l'app web.
- Pas de mise à jour d'inventaire (update/remove) ni d'autres outils d'écriture dans ce change.

## Decisions

- **Réutiliser les use cases existants tels quels.** `createIngredient` et `addInventoryItem` sont déjà câblés ; les outils MCP se contentent d'adapter l'entrée et de renvoyer la vue via `jsonContent`. Alternative écartée : un use case dédié « MCP » — superflu, le domaine est identique à l'app web.

- **`create_ingredient` : champs minimaux uniquement** (`name`, `category`, `canonicalUnit`, `storage`). Ce sont les 4 champs requis du domaine ; le reste a des défauts sains. Réutilise `CreateIngredientSchema` (côté validation). Alternative écartée : exposer tous les champs — schéma d'entrée lourd pour un LLM, gain faible.

- **`add_inventory_item` : `ingredientId` (UUID) requis, pas de résolution par nom.** Conforme au pattern read existant (`get_ingredient` prend un `ingredientId`). L'agent enchaîne `list_ingredients` → `add_inventory_item`. `location` optionnel (le use case applique son défaut). La réponse `{ item, created }` informe l'agent s'il a créé une ligne ou incrémenté une ligne existante (upsert). Alternative écartée : accepter un nom et auto-créer l'ingrédient — couple les deux capacités et duplique la logique de `create_ingredient`.

- **Aucun `householdId`/`source` en entrée.** Injection depuis le PAT, comme tous les outils. Si l'agent passe `householdId` dans les arguments, il est ignoré/rejeté (Zod `inputSchema` ne le déclare pas).

- **Gestion d'erreurs cohérente.** Erreurs métier attendues (ex. nom d'ingrédient dupliqué, unité incompatible, ingrédient introuvable / hors foyer) renvoyées comme résultat MCP `isError: true` avec le message, à l'image de `save_recipe_draft` (qui catch `RecipeDraftLimitReachedError`). Les autres erreurs remontent.

- **Cohérence du compte d'outils.** Mettre à jour les trois requirements du spec `mcp` (11 → 13) et l'OpenAPI servi à `/openapi-mcp.yaml` (déclarer les deux nouveaux `operationId` + `x-mcp-tool`). Le well-known api-catalog n'énumère pas les outils — pas de changement.

## Risks / Trade-offs

- **Surface d'écriture élargie** → toute écriture reste scoped au foyer du PAT via le même mécanisme que `save_recipe_draft` ; ajout de scénarios d'isolation foyer et de rejet de `householdId` dans les tests smoke.
- **`ingredientId` invalide ou d'un autre foyer** → `addInventoryItem` s'appuie sur `IIngredientLookup.findById(id, householdId)` qui scope déjà au foyer ; un id inconnu/hors foyer doit produire un résultat d'erreur MCP propre, pas un 500.
- **Désynchronisation du compte d'outils** (code vs OpenAPI vs tests) → mitigé par un test smoke qui assert la liste exacte des 13 `operationId`, qui échouera si l'un des trois diverge.
- **Unité de `quantity` non canonique** → `Quantity.fromUserInput` convertit à la frontière ; le use case rejette les unités incompatibles avec la dimension de l'ingrédient (erreur métier → `isError`).
