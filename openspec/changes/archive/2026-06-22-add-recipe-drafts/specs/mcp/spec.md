## MODIFIED Requirements

### Requirement: MCP HTTP Endpoint

The system SHALL expose a Model Context Protocol endpoint at `POST /mcp` (and `GET /mcp`, `DELETE /mcp`) conforming to the MCP `StreamableHTTP` transport specification.

The endpoint MUST operate in **stateless** mode in v1: each POST is self-contained, no session continuity is maintained across requests, and no `Mcp-Session-Id` is set in responses.

The endpoint MUST be authenticated via Personal Access Token (PAT) per the platform spec — cookie sessions are NOT accepted on `/mcp`.

The endpoint MAY expose **mutating** tools (in addition to read-only ones); any such tool MUST scope its writes to the household bound to the authenticated PAT.

#### Scenario: Successful tools/list call
- GIVEN an active PAT bound to `(user-1, hh-1)`
- WHEN the client sends `POST /mcp` with `Authorization: Bearer <pat>` and body `{ jsonrpc: "2.0", id: 1, method: "tools/list" }`
- THEN the response is `200 OK` with the list of registered tools
- AND the response contains exactly 11 tools (see "MCP Tool Catalog" requirement)

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

The system SHALL register the following 11 tools, all prefixed `mealmanager_`. Eight are read-only; three operate on recipe drafts, of which `mealmanager_save_recipe_draft` is the only **write** tool:

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
| `mealmanager_save_recipe_draft` | `saveRecipeDraft` | write |

Each tool's input schema MUST NOT contain a `householdId` field. The `householdId` is injected from the authenticated PAT and is never accepted from the client.

The tool description for `mealmanager_get_menu_for_week` MUST explicitly note that an empty menu is created if none exists for the requested week (matching existing web behavior).

`mealmanager_save_recipe_draft` MUST persist the submitted draft content with `source` forced to `mcp` server-side (the `source` is never accepted from the tool input), scoped to the PAT's household, and MUST be subject to the per-household draft cap. Its input is recipe-draft content only (optional title, optional instructions, optional servings, free-text ingredients, optional source URL).

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

### Requirement: OpenAPI description of /mcp is served at /openapi-mcp.yaml

The system SHALL serve an OpenAPI 3.1 description of the MCP endpoint at `GET /openapi-mcp.yaml` with `Content-Type` indicating YAML (`application/yaml` or `text/yaml`).

The OpenAPI document MUST declare a `bearerAuth` security scheme of type HTTP Bearer.

The OpenAPI document MUST list all 11 MCP tools as `operationId` values prefixed `mealmanager_`, each documented with an `x-mcp-tool` extension carrying the tool's input schema.

The OpenAPI document MUST NOT declare a `householdId` field in any tool's input schema (the household is injected from the authenticated PAT, never from the client). It MUST NOT declare a `source` field in `mealmanager_save_recipe_draft` (forced to `mcp` server-side).

#### Scenario: GET /openapi-mcp.yaml serves a YAML document
- WHEN an unauthenticated client sends `GET /openapi-mcp.yaml`
- THEN the response is `200 OK`
- AND the `Content-Type` indicates YAML
- AND the body parses as a valid YAML document

#### Scenario: OpenAPI declares the 11 mealmanager tools
- WHEN the OpenAPI document is parsed
- THEN the set of `operationId` values prefixed `mealmanager_` equals the 11 tools registered by `registerAllTools`:
  - `mealmanager_list_inventory`
  - `mealmanager_list_recipes`
  - `mealmanager_get_recipe`
  - `mealmanager_get_menu_for_week`
  - `mealmanager_get_shopping_list`
  - `mealmanager_list_ingredients`
  - `mealmanager_get_ingredient`
  - `mealmanager_get_household`
  - `mealmanager_list_recipe_drafts`
  - `mealmanager_get_recipe_draft`
  - `mealmanager_save_recipe_draft`

#### Scenario: OpenAPI declares Bearer auth
- WHEN the OpenAPI document is parsed
- THEN `components.securitySchemes.bearerAuth.type == "http"`
- AND `components.securitySchemes.bearerAuth.scheme == "bearer"`
