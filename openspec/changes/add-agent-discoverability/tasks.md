# Tasks

Checklist d'implémentation du change `add-agent-discoverability`. Aucun code domaine touché ; livraison incrémentale possible — chaque section laisse l'app en état exécutable (`pnpm test` vert, `pnpm typecheck` OK).

## 1. Bot Access Control

- [ ] 1.1 Créer `public/robots.txt` avec Disallow `/` pour : GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Meta-ExternalAgent, Meta-ExternalFetcher, Bytespider, Applebot-Extended, CCBot, cohere-ai, Diffbot, ImagesiftBot, puis wildcard `User-agent: *`.

## 2. OpenAPI MCP

- [ ] 2.1 Créer `public/openapi-mcp.yaml` (OpenAPI 3.1) :
  - `info` (titre, version, description courte).
  - `servers`: relatif (`/`).
  - `paths`: `POST /mcp`, `GET /mcp`, `DELETE /mcp` (auth requise).
  - `components.securitySchemes.bearerAuth` (HTTP Bearer, `bearerFormat: mm_pat_*`).
  - Pour chaque tool MCP : un `operationId mealmanager_<tool>` documenté en `x-mcp-tool` avec inputSchema repris depuis `server/routes/mcp/tools/<file>.ts`.

## 3. Protocol Discovery — RFC 9727

- [ ] 3.1 Créer `server/routes/.well-known/api-catalog.get.ts` :
  - `setResponseHeader content-type: application/linkset+json`.
  - `cache-control: public, max-age=3600`.
  - Body : `{ linkset: [{ anchor: '/', item: [...], 'service-desc': [...], related: [...] }] }`.
  - `item` → `/mcp` avec `profile: urn:ietf:params:mcp:transport:streamable-http`.
  - `service-desc` → `/openapi-mcp.yaml`.
  - `related` → `/llms.txt` et `/llms-full.txt`.

## 4. Discoverability — Link header middleware

- [ ] 4.1 Créer `server/middleware/link-headers.ts` :
  - Court-circuit explicite : `if (event.path?.startsWith('/mcp')) return`.
  - Ajoute (merge avec un éventuel `Link` déjà posé) :
    - `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`
    - `</llms.txt>; rel="llms-txt"; type="text/plain"`
    - `</openapi-mcp.yaml>; rel="service-desc"; type="application/yaml"`

## 5. Tests intégration

- [ ] 5.1 Créer `tests/integration/http/agent-discoverability.test.ts` couvrant :
  - api-catalog handler : retourne un linkset avec un `item.href` == `/mcp`, `profile` MCP, `service-desc.href` == `/openapi-mcp.yaml` ; `Content-Type: application/linkset+json`.
  - Link-headers middleware : pose un header `Link` sur une réponse normale, contenant `rel="api-catalog"`.
  - Link-headers middleware : ne pose **pas** de header sur les chemins commençant par `/mcp`.
  - Link-headers middleware : si un `Link` existe déjà, le merge sans écraser.

## 6. Discoverabilité documentaire (llms.txt)

- [ ] 6.1 Mettre à jour `public/llms.txt` : ajouter pointeurs vers `/.well-known/api-catalog` et `/openapi-mcp.yaml`.
- [ ] 6.2 Mettre à jour `public/llms-full.txt` : section « Discovery endpoints » listant les 4 ressources publiques agent.

## 7. Documentation

- [ ] 7.1 Mettre à jour `README.md` : encart « Agent discovery » listant `/mcp`, `/.well-known/api-catalog`, `/openapi-mcp.yaml`, `/llms.txt`.
- [ ] 7.2 Mettre à jour `docs/COMMITS.md` : ajouter le scope `discoverability` à la liste des scopes autorisés.

## 8. Vérification finale

- [ ] 8.1 `pnpm lint` vert.
- [ ] 8.2 `pnpm typecheck` vert.
- [ ] 8.3 `pnpm test` vert.
- [ ] 8.4 `npx -y -p @fission-ai/openspec@latest openspec validate add-agent-discoverability` vert.

## Vérification manuelle (post-déploiement)

- [ ] `curl -i /robots.txt` → 200, `Content-Type: text/plain`, contient `User-agent: GPTBot` et `Disallow: /`.
- [ ] `curl -s /.well-known/api-catalog | jq .` → linkset JSON avec `item[0].href == "/mcp"`.
- [ ] `curl -sI /` → header `Link:` contenant `rel="api-catalog"`.
- [ ] `curl -sI /mcp` (sans PAT) → 401, **pas** de header `Link`.
- [ ] Régression : `curl /mcp` avec PAT renvoie toujours les 8 tools via `tools/list`.
- [ ] Re-passer le site dans `isitagentready.com` après déploiement : axes Discoverability, Bot Access Control et Protocol Discovery passent au vert.
