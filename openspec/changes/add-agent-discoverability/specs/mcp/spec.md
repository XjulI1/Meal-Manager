# Delta for MCP

Ajoute la **discoverabilité machine-lisible** de l'endpoint MCP : un catalogue d'APIs ([RFC 9727](https://www.rfc-editor.org/rfc/rfc9727.html)) à `/.well-known/api-catalog`, et une description OpenAPI 3.1 du endpoint à `/openapi-mcp.yaml`. Aucune modification du transport MCP existant ni des 8 tools.

## ADDED Requirements

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
