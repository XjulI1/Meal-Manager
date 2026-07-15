## MODIFIED Requirements

### Requirement: MCP Tool Catalog

The system SHALL register the following 16 tools, all prefixed `mealmanager_`. Twelve are read-only; four are **write** tools (`mealmanager_save_recipe_draft`, `mealmanager_create_ingredient`, `mealmanager_add_inventory_item`, `mealmanager_save_wine_enrichment`):

| Tool | Underlying use case | Kind |
|---|---|---|
| `mealmanager_list_inventory` | `listInventoryItems` | read |
| `mealmanager_list_recipes` | `listRecipes` | read |
| `mealmanager_get_recipe` | `getRecipeById` | read |
| `mealmanager_get_menu_for_week` | `getMenuByWeek` | read |
| `mealmanager_get_shopping_list` | `getShoppingListByMenu` | read |
| `mealmanager_list_ingredients` | `listIngredients` | read |
| `mealmanager_get_ingredient` | `getIngredient` | read |
| `mealmanager_get_household` | `getCurrentHousehold` | read |
| `mealmanager_list_recipe_drafts` | `listRecipeDrafts` | read |
| `mealmanager_get_recipe_draft` | `getRecipeDraftById` | read |
| `mealmanager_list_wines` | `listWines` | read |
| `mealmanager_get_wine` | `getWine` | read |
| `mealmanager_save_recipe_draft` | `saveRecipeDraft` | write |
| `mealmanager_create_ingredient` | `createIngredient` | write |
| `mealmanager_add_inventory_item` | `addInventoryItem` | write |
| `mealmanager_save_wine_enrichment` | `saveWineEnrichment` | write |

Each tool's input schema MUST NOT contain a `householdId` field. The `householdId` is injected from the authenticated PAT and is never accepted from the client.

The tool description for `mealmanager_get_menu_for_week` MUST explicitly note that an empty menu is created if none exists for the requested week (matching existing web behavior).

`mealmanager_save_recipe_draft` MUST persist the submitted draft content with `source` forced to `mcp` server-side (the `source` is never accepted from the tool input), scoped to the PAT's household, and MUST be subject to the per-household draft cap. Its input is recipe-draft content only (optional title, optional instructions, optional servings, free-text ingredients, optional source URL).

`mealmanager_create_ingredient` MUST create an ingredient in the PAT's household via the `createIngredient` use case. Its input is the minimal ingredient fields only: `name` (required), `category` (required), `canonicalUnit` (required, one of `g`/`ml`/`unit`), `storage` (required, one of `pantry`/`fridge`/`freezer`). Advanced fields (aliases, allergens, shelf life, image URL, default pack size) are NOT exposed. The tool MUST return the created ingredient view (including its `id`) as JSON text content. A business error (e.g. duplicate ingredient name) MUST be returned as an error tool result, not a transport-level 500.

`mealmanager_add_inventory_item` MUST add or increment an inventory item in the PAT's household via the `addInventoryItem` use case (upsert semantics on `(householdId, ingredientId, location)`). Its input is: `ingredientId` (required UUID), `quantity` (`{ value, unit }`, required), and `location` (optional, one of `pantry`/`fridge`/`freezer`). The tool MUST return `{ item, created }` as JSON text content, where `created` is `true` when a new line was inserted and `false` when an existing line was incremented. An unknown or cross-household `ingredientId`, or a quantity unit incompatible with the ingredient's dimension, MUST be returned as an error tool result, not a transport-level 500.

`mealmanager_list_wines` MUST return the wines of the PAT's household via the `listWines` use case. Its input is an optional `enriched` boolean filter: `true` returns only wines already enriched, `false` only wines not yet enriched (`aiEnrichedAt` null), absent returns all. Each returned entry MUST include at least `id`, `name`, `domain`, `region`, `vintage`, `color`, and an `isEnriched` boolean derived from `aiEnrichedAt`.

`mealmanager_get_wine` MUST return the full details of a single wine of the PAT's household via the `getWine` use case. Its input is `wineId` (required UUID). An unknown or cross-household `wineId` MUST be returned as an error tool result, not a transport-level 500.

`mealmanager_save_wine_enrichment` MUST persist agent-supplied enrichment values for a wine of the PAT's household, WITHOUT any server-side AI call. Its input is `wineId` (required UUID) plus the optional enrichment fields `gardeMin`, `gardeMax` (apogée years), `aromas`, `foodPairings` (free text). The `householdId` is taken from the PAT and never accepted from the tool input. Persistence MUST follow the same rules as the in-app enrichment: a field omitted by the agent leaves the existing value unchanged, an incoherent garde window (`gardeMin > gardeMax`) is neutralized (the existing window is kept), and `aiEnrichedAt` is stamped to the current time. Re-enrichment of an already-enriched wine is allowed (the supplied fields overwrite and `aiEnrichedAt` is refreshed). The tool description MUST carry the research brief (sommelier role: research the cuvée's garde window, aromatic profile and food pairings; never invent — omit an unreliable field). An unknown or cross-household `wineId` MUST be returned as an error tool result, not a transport-level 500. The tool MUST return the updated wine view as JSON text content.

#### Scenario: Calling list_inventory uses the PAT's household
- GIVEN an active PAT bound to `(user-1, hh-1)`
- WHEN the client calls `tools/call` with `{ name: "mealmanager_list_inventory", arguments: {} }`
- THEN the use case `listInventoryItems` is invoked with `{ householdId: "hh-1" }`
- AND the response contains the items of household `hh-1`

#### Scenario: Cross-household isolation
- GIVEN PAT A bound to `(user-A, hh-A)` and PAT B bound to `(user-B, hh-B)`
- WHEN PAT A is used to call `mealmanager_list_inventory`
- THEN the response contains only items of `hh-A`, never items of `hh-B`

#### Scenario: householdId in arguments is ignored
- GIVEN PAT bound to `(user-1, hh-1)`
- WHEN the client calls `tools/call` with arguments that attempt to include `{ householdId: "hh-other" }`
- THEN the system either rejects the input as invalid OR ignores the field
- AND the request resolves against `hh-1` only

#### Scenario: get_recipe with valid id
- GIVEN PAT bound to `(user-1, hh-1)` and a recipe `rec-1` belonging to `hh-1`
- WHEN the client calls `tools/call` with `{ name: "mealmanager_get_recipe", arguments: { recipeId: "rec-1" } }`
- THEN the response contains the recipe view as JSON text content

#### Scenario: get_menu_for_week creates lazy
- GIVEN PAT bound to `(user-1, hh-1)` with no menu for week `2026-W21`
- WHEN the client calls `mealmanager_get_menu_for_week` with `{ weekStart: "2026-05-18" }` (Monday of W21)
- THEN the response contains an empty menu view for that week
- AND a row is persisted (consistent with the existing web behavior)

#### Scenario: save_recipe_draft persists under the PAT's household with source=mcp
- GIVEN PAT bound to `(user-1, hh-1)`
- WHEN the client calls `tools/call` with `{ name: "mealmanager_save_recipe_draft", arguments: { title: "Soupe de courge", ingredients: [{ name: "courge" }] } }`
- THEN the use case `saveRecipeDraft` is invoked with `{ householdId: "hh-1", source: "mcp", ... }`
- AND a recipe draft is persisted in household `hh-1` with `source: "mcp"`
- AND the response contains the created draft id as JSON text content

#### Scenario: save_recipe_draft ignores any client-supplied household or source
- GIVEN PAT bound to `(user-1, hh-1)`
- WHEN the client calls `mealmanager_save_recipe_draft` with arguments attempting to set `{ householdId: "hh-other", source: "manual" }`
- THEN the draft is persisted in `hh-1` with `source: "mcp"`
- AND the `householdId` and `source` arguments are ignored or rejected

#### Scenario: save_recipe_draft respects the per-household cap
- GIVEN PAT bound to a household already at `RECIPE_DRAFTS_MAX_PER_HOUSEHOLD` drafts
- WHEN the client calls `mealmanager_save_recipe_draft`
- THEN the tool call returns an error result and no draft is created

#### Scenario: list_recipe_drafts returns only the PAT's household drafts
- GIVEN PAT bound to `(user-1, hh-1)` which has two drafts
- WHEN the client calls `mealmanager_list_recipe_drafts`
- THEN the response contains exactly the two `hh-1` drafts and no draft from any other household

#### Scenario: create_ingredient persists under the PAT's household
- GIVEN PAT bound to `(user-1, hh-1)`
- WHEN the client calls `tools/call` with `{ name: "mealmanager_create_ingredient", arguments: { name: "Courgette", category: "produce", canonicalUnit: "unit", storage: "fridge" } }`
- THEN the use case `createIngredient` is invoked with `{ householdId: "hh-1", name: "Courgette", category: "produce", canonicalUnit: "unit", storage: "fridge" }`
- AND an ingredient is persisted in household `hh-1`
- AND the response contains the created ingredient view (including its `id`) as JSON text content

#### Scenario: create_ingredient ignores any client-supplied household
- GIVEN PAT bound to `(user-1, hh-1)`
- WHEN the client calls `mealmanager_create_ingredient` with arguments attempting to set `{ householdId: "hh-other" }`
- THEN the ingredient is persisted in `hh-1`
- AND the `householdId` argument is ignored or rejected

#### Scenario: create_ingredient with a duplicate name returns an error result
- GIVEN PAT bound to `(user-1, hh-1)` which already has an active ingredient named "Courgette"
- WHEN the client calls `mealmanager_create_ingredient` with `{ name: "Courgette", category: "produce", canonicalUnit: "unit", storage: "fridge" }`
- THEN the tool call returns an error result and no ingredient is created

#### Scenario: add_inventory_item adds a new line under the PAT's household
- GIVEN PAT bound to `(user-1, hh-1)` and an ingredient `ing-1` belonging to `hh-1` with no inventory line in the pantry
- WHEN the client calls `tools/call` with `{ name: "mealmanager_add_inventory_item", arguments: { ingredientId: "ing-1", quantity: { value: 500, unit: "g" }, location: "pantry" } }`
- THEN the use case `addInventoryItem` is invoked with `{ householdId: "hh-1", ingredientId: "ing-1", quantity: { value: 500, unit: "g" }, location: "pantry" }`
- AND an inventory line is persisted in household `hh-1`
- AND the response contains `{ item, created: true }` as JSON text content

#### Scenario: add_inventory_item increments an existing line (upsert)
- GIVEN PAT bound to `(user-1, hh-1)` and an existing pantry inventory line for ingredient `ing-1`
- WHEN the client calls `mealmanager_add_inventory_item` for `ing-1` in the pantry with an additional quantity
- THEN the existing line quantity is incremented (no second line is created)
- AND the response contains `{ item, created: false }` as JSON text content

#### Scenario: add_inventory_item supports the freezer location
- GIVEN PAT bound to `(user-1, hh-1)` and an ingredient `ing-1` belonging to `hh-1`
- WHEN the client calls `mealmanager_add_inventory_item` with `{ ingredientId: "ing-1", quantity: { value: 2, unit: "unit" }, location: "freezer" }`
- THEN an inventory line is persisted in household `hh-1` with location `freezer`

#### Scenario: add_inventory_item with an unknown or cross-household ingredient returns an error result
- GIVEN PAT bound to `(user-1, hh-1)`
- WHEN the client calls `mealmanager_add_inventory_item` with an `ingredientId` that does not belong to `hh-1`
- THEN the tool call returns an error result and no inventory line is created

#### Scenario: list_wines filters wines not yet enriched
- GIVEN PAT bound to `(user-1, hh-1)` with one enriched wine and one never-enriched wine
- WHEN the client calls `tools/call` with `{ name: "mealmanager_list_wines", arguments: { enriched: false } }`
- THEN the response contains only the never-enriched wine
- AND each entry carries `isEnriched: false`

#### Scenario: get_wine returns full details for the PAT's household
- GIVEN PAT bound to `(user-1, hh-1)` and a wine `wine-1` belonging to `hh-1`
- WHEN the client calls `tools/call` with `{ name: "mealmanager_get_wine", arguments: { wineId: "wine-1" } }`
- THEN the response contains the full wine view as JSON text content

#### Scenario: get_wine with a cross-household id returns an error result
- GIVEN PAT bound to `(user-1, hh-1)` and a wine `wine-2` belonging to another household
- WHEN the client calls `mealmanager_get_wine` with `{ wineId: "wine-2" }`
- THEN the tool call returns an error result and no wine data of another household is disclosed

#### Scenario: save_wine_enrichment persists under the PAT's household and stamps aiEnrichedAt
- GIVEN PAT bound to `(user-1, hh-1)` and a never-enriched wine `wine-1` belonging to `hh-1`
- WHEN the client calls `tools/call` with `{ name: "mealmanager_save_wine_enrichment", arguments: { wineId: "wine-1", gardeMin: 2025, gardeMax: 2032, aromas: "fruits rouges", foodPairings: "viandes grillées" } }`
- THEN the use case `saveWineEnrichment` is invoked with `{ householdId: "hh-1", id: "wine-1", ... }`
- AND the wine's `aromas`, `foodPairings` and garde window are persisted
- AND `aiEnrichedAt` is set to the current time
- AND the response contains the updated wine view as JSON text content

#### Scenario: save_wine_enrichment ignores any client-supplied household
- GIVEN PAT bound to `(user-1, hh-1)`
- WHEN the client calls `mealmanager_save_wine_enrichment` with arguments attempting to set `{ householdId: "hh-other", wineId: "wine-1" }`
- THEN the enrichment is applied to `wine-1` within `hh-1`
- AND the `householdId` argument is ignored or rejected

#### Scenario: save_wine_enrichment re-enriches an already-enriched wine
- GIVEN PAT bound to `(user-1, hh-1)` and an already-enriched wine `wine-1`
- WHEN the client calls `mealmanager_save_wine_enrichment` with new values for `wine-1`
- THEN the supplied fields overwrite the previous values
- AND `aiEnrichedAt` is refreshed

#### Scenario: save_wine_enrichment leaves an omitted field unchanged
- GIVEN PAT bound to `(user-1, hh-1)` and a wine `wine-1` with an existing garde window
- WHEN the client calls `mealmanager_save_wine_enrichment` with only `{ wineId: "wine-1", aromas: "minéral" }`
- THEN only `aromas` is written and the existing garde window is preserved

#### Scenario: save_wine_enrichment neutralizes an incoherent garde window
- GIVEN PAT bound to `(user-1, hh-1)` and a wine `wine-1` with an existing garde window
- WHEN the client calls `mealmanager_save_wine_enrichment` with `{ wineId: "wine-1", gardeMin: 2035, gardeMax: 2020 }`
- THEN the existing garde window is preserved (the incoherent pair is not persisted)
- AND the tool does not return a transport-level 500

#### Scenario: save_wine_enrichment with a cross-household wine returns an error result
- GIVEN PAT bound to `(user-1, hh-1)` and a wine `wine-2` belonging to another household
- WHEN the client calls `mealmanager_save_wine_enrichment` with `{ wineId: "wine-2", aromas: "x" }`
- THEN the tool call returns an error result and no wine of another household is modified
