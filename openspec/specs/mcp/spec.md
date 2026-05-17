# mcp Specification

## Purpose
TBD - created by archiving change add-mcp-llm-integration. Update Purpose after archive.
## Requirements
### Requirement: MCP HTTP Endpoint

The system SHALL expose a Model Context Protocol endpoint at `POST /mcp` (and `GET /mcp`, `DELETE /mcp`) conforming to the MCP `StreamableHTTP` transport specification.

The endpoint MUST operate in **stateless** mode in v1: each POST is self-contained, no session continuity is maintained across requests, and no `Mcp-Session-Id` is set in responses.

The endpoint MUST be authenticated via Personal Access Token (PAT) per the platform spec — cookie sessions are NOT accepted on `/mcp`.

#### Scenario: Successful tools/list call
- GIVEN an active PAT bound to `(user-1, hh-1)`
- WHEN the client sends `POST /mcp` with `Authorization: Bearer <pat>` and body `{ jsonrpc: "2.0", id: 1, method: "tools/list" }`
- THEN the response is `200 OK` with the list of registered tools
- AND the response contains exactly 8 tools (see "MCP Tool Catalog" requirement)

#### Scenario: Unauthenticated request
- GIVEN a `POST /mcp` request with no Authorization header
- WHEN the server processes the request
- THEN the response is `401 Unauthorized`
- AND the response includes `WWW-Authenticate: Bearer realm="meal-manager-mcp"`
- AND no business logic is executed

#### Scenario: Cookie session is NOT accepted on /mcp
- GIVEN a request with a valid cookie session but no Authorization header
- WHEN the server processes `POST /mcp`
- THEN the response is `401 Unauthorized`

### Requirement: MCP Tool Catalog

The system SHALL register the following 8 read-only tools, all prefixed `mealmanager_`:

| Tool | Underlying use case |
|---|---|
| `mealmanager_list_inventory` | `listInventoryItems` |
| `mealmanager_list_recipes` | `listRecipes` |
| `mealmanager_get_recipe` | `getRecipeById` |
| `mealmanager_get_menu_for_week` | `getMenuByWeek` |
| `mealmanager_get_shopping_list` | `getShoppingListByMenu` |
| `mealmanager_list_ingredients` | `listIngredients` |
| `mealmanager_get_ingredient` | `getIngredient` |
| `mealmanager_get_household` | `getCurrentHousehold` |

Each tool's input schema MUST NOT contain a `householdId` field. The `householdId` is injected from the authenticated PAT and is never accepted from the client.

The tool description for `mealmanager_get_menu_for_week` MUST explicitly note that an empty menu is created if none exists for the requested week (matching existing web behavior).

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

