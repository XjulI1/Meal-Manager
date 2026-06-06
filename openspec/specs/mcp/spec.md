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

### Requirement: API Catalog (RFC 9727) advertises the MCP endpoint

The system SHALL serve an API catalog at `GET /.well-known/api-catalog` conforming to [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727.html), with `Content-Type: application/linkset+json` per [RFC 9264](https://www.rfc-editor.org/rfc/rfc9264.html).

The catalog MUST advertise the MCP endpoint as an `item` link with `href: "/mcp"` and a `profile` parameter identifying the MCP Streamable HTTP transport.

The catalog MUST advertise the OpenAPI description of `/mcp` via a `service-desc` link with `href: "/openapi-mcp.yaml"` and `type: "application/yaml"`.

The catalog SHOULD advertise the LLM-oriented summary documents (`/llms.txt`, `/llms-full.txt`) via `related` links.

The endpoint MUST NOT require authentication (it is part of the publicly-discoverable surface).

#### Scenario: GET /.well-known/api-catalog returns a linkset
- WHEN an unauthenticated client sends `GET /.well-known/api-catalog`
- THEN the response is `200 OK`
- AND the `Content-Type` is `application/linkset+json`
- AND the body parses as JSON with a top-level `linkset` array of length ≥ 1

#### Scenario: Linkset advertises /mcp as an item
- WHEN the API catalog is fetched
- THEN there exists an entry `linkset[0].item[i].href == "/mcp"`
- AND that entry has a `profile` parameter whose value contains the substring `mcp` (identifies the MCP transport)

#### Scenario: Linkset advertises the OpenAPI service description
- WHEN the API catalog is fetched
- THEN there exists an entry `linkset[0]["service-desc"][i].href == "/openapi-mcp.yaml"`
- AND that entry has `type: "application/yaml"`

#### Scenario: Linkset advertises the LLM-oriented documents
- WHEN the API catalog is fetched
- THEN `linkset[0].related` includes an entry with `href == "/llms.txt"`
- AND `linkset[0].related` includes an entry with `href == "/llms-full.txt"`

### Requirement: OpenAPI description of /mcp is served at /openapi-mcp.yaml

The system SHALL serve an OpenAPI 3.1 description of the MCP endpoint at `GET /openapi-mcp.yaml` with `Content-Type` indicating YAML (`application/yaml` or `text/yaml`).

The OpenAPI document MUST declare a `bearerAuth` security scheme of type HTTP Bearer.

The OpenAPI document MUST list all 8 MCP tools as `operationId` values prefixed `mealmanager_`, each documented with an `x-mcp-tool` extension carrying the tool's input schema.

The OpenAPI document MUST NOT declare a `householdId` field in any tool's input schema (the household is injected from the authenticated PAT, never from the client).

#### Scenario: GET /openapi-mcp.yaml serves a YAML document
- WHEN an unauthenticated client sends `GET /openapi-mcp.yaml`
- THEN the response is `200 OK`
- AND the `Content-Type` indicates YAML
- AND the body parses as a valid YAML document

#### Scenario: OpenAPI declares the 8 mealmanager tools
- WHEN the OpenAPI document is parsed
- THEN the set of `operationId` values prefixed `mealmanager_` equals the 8 tools registered by `registerAllTools`:
  - `mealmanager_list_inventory`
  - `mealmanager_list_recipes`
  - `mealmanager_get_recipe`
  - `mealmanager_get_menu_for_week`
  - `mealmanager_get_shopping_list`
  - `mealmanager_list_ingredients`
  - `mealmanager_get_ingredient`
  - `mealmanager_get_household`

#### Scenario: OpenAPI declares Bearer auth
- WHEN the OpenAPI document is parsed
- THEN `components.securitySchemes.bearerAuth.type == "http"`
- AND `components.securitySchemes.bearerAuth.scheme == "bearer"`

