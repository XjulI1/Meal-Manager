# Proposal: Discoverability « agent-ready » (RFC 9727 + robots.txt + OpenAPI MCP)

## Why

Le change `add-mcp-llm-integration` (archivé) a exposé un endpoint MCP fonctionnel à `/mcp` avec auth Bearer PAT, plus `public/llms.txt` / `public/llms-full.txt`. C'est suffisant pour qu'un utilisateur **qui sait déjà** que Meal Manager parle MCP configure son client (Claude Desktop, Home Assistant, etc.).

Ce qui manque pour qu'un agent ou un outil de scan (type [isitagentready.com](https://isitagentready.com)) **découvre** seul les capacités :

1. **Bot Access Control** — pas de `robots.txt`. Les crawlers IA n'ont aucune indication que les pages HTML privées de l'app ne leur sont pas destinées (le canal légitime est `/mcp` avec PAT, pas le scraping du HTML).
2. **Protocol Discovery** — pas de `/.well-known/api-catalog` ([RFC 9727](https://www.rfc-editor.org/rfc/rfc9727.html)). Un agent qui débarque sur le domaine n'a aucun point d'entrée standard pour découvrir les APIs.
3. **Discoverability** — pas de header HTTP `Link` annonçant les ressources de découverte sur les réponses ordinaires.
4. **Description machine-lisible de `/mcp`** — `llms-full.txt` est en prose markdown. Pas d'OpenAPI / JSON Schema téléchargeable.

Ces quatre éléments sont des fichiers / endpoints purement déclaratifs au niveau transport. Aucune logique métier, aucune migration, aucune dépendance npm.

## What Changes

### 1. `public/robots.txt` — Bot Access Control

Disallow `/` pour ~18 user-agents IA connus (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Meta-ExternalAgent, Meta-ExternalFetcher, Bytespider, Applebot-Extended, CCBot, cohere-ai, Diffbot, ImagesiftBot) **+ wildcard `User-agent: *`**. Politique cohérente avec une app familiale privée : le seul canal agent légitime est `POST /mcp` derrière PAT explicite.

### 2. `server/routes/.well-known/api-catalog.get.ts` — Protocol Discovery (RFC 9727)

Endpoint Nitro renvoyant `application/linkset+json` avec :
- `item` → `/mcp` (avec `profile: urn:ietf:params:mcp:transport:streamable-http`)
- `service-desc` → `/openapi-mcp.yaml`
- `related` → `/llms.txt` et `/llms-full.txt`

### 3. `server/middleware/link-headers.ts` — Discoverability

Middleware Nitro qui pose un header `Link` sur toutes les réponses **sauf `/mcp`** (le SDK MCP écrit directement sur `event.node.res`, ne pas polluer) :

```
Link: </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json",
      </llms.txt>; rel="llms-txt"; type="text/plain",
      </openapi-mcp.yaml>; rel="service-desc"; type="application/yaml"
```

### 4. `public/openapi-mcp.yaml` — OpenAPI 3.1 du endpoint MCP

Fichier statique décrivant `POST /mcp`, `GET /mcp`, `DELETE /mcp`, le `securityScheme bearerAuth` (`mm_pat_*`), et les 8 tools `mealmanager_*` (en `operationId` + extension `x-mcp-tool` reprenant les schémas Zod inline).

### 5. Mises à jour mineures

- `public/llms.txt` et `public/llms-full.txt` : section « Discovery endpoints » pointant vers `/.well-known/api-catalog` et `/openapi-mcp.yaml`.
- `README.md` : encart « Agent discovery » listant les 4 endpoints publics agent.
- `docs/COMMITS.md` : ajouter le scope `discoverability`.

**Hors scope explicite v1** (décidé avec l'utilisateur) :
- Content negotiation Markdown (`Accept: text/markdown`) sur les pages HTML.
- `sitemap.xml`.
- Agentic Commerce Protocol (ACP) — pas applicable (app non commerciale).
- OpenAPI pour les 35 routes HTTP `/api/*` cookie-auth — routes UI-facing, peu de valeur agent.
- Versioning d'API (`/api/v1/`).
- Format d'erreurs structuré (RFC 7807 Problem Details).
- `/.well-known/oauth-authorization-server` (RFC 8414) — OAuth 2.1 reste différé en v2 (cohérent avec design.md D5 du change MCP archivé).

## Capabilities

### Modified Capabilities

- `mcp` : ajout d'un manifeste machine-lisible (`/.well-known/api-catalog` + `/openapi-mcp.yaml`) annonçant l'endpoint `/mcp` et le format d'auth Bearer PAT.
- `platform` : ajout de la politique « Bot Access Control via robots.txt » et de l'annonce des ressources de découverte via header HTTP `Link` sur les réponses applicatives.

## Impact

**Code créé** :
- `public/robots.txt`, `public/openapi-mcp.yaml`.
- `server/routes/.well-known/api-catalog.get.ts`.
- `server/middleware/link-headers.ts`.
- `tests/integration/http/agent-discoverability.test.ts`.

**Code modifié** :
- `public/llms.txt`, `public/llms-full.txt` : section « Discovery endpoints ».
- `README.md` : encart agent discovery.
- `docs/COMMITS.md` : nouveau scope `discoverability`.

**DB** : aucun changement.
**API** : aucune route métier modifiée. 2 nouveaux endpoints (`/.well-known/api-catalog`, `/openapi-mcp.yaml` via static + `/robots.txt` via static).
**Dépendances npm** : aucune.
**Tests** : 1 nouveau fichier d'intégration (4 cas).
