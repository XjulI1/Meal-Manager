# Delta for Platform

Ajoute deux exigences transverses au transport HTTP : **Bot Access Control** via `robots.txt`, et **annonce des ressources de découverte** via le header HTTP `Link` sur les réponses applicatives.

## ADDED Requirements

### Requirement: Bot Access Control via robots.txt

The system SHALL serve a `robots.txt` file at the root of the domain (`GET /robots.txt`) that explicitly disallows the following AI crawler user-agents from the entire site (`Disallow: /`):

`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `anthropic-ai`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Meta-ExternalAgent`, `Meta-ExternalFetcher`, `Bytespider`, `Applebot-Extended`, `CCBot`, `cohere-ai`, `Diffbot`, `ImagesiftBot`.

The file MUST also include a wildcard `User-agent: *` block with `Disallow: /` (the application is private — all HTML pages are behind authentication anyway).

The legitimate agent channel — `POST /mcp` with a Bearer Personal Access Token — is intentionally NOT mentioned in `robots.txt` (PAT-authenticated MCP traffic is not subject to crawler rules).

#### Scenario: robots.txt is served at the root
- WHEN an unauthenticated client sends `GET /robots.txt`
- THEN the response is `200 OK`
- AND the `Content-Type` is `text/plain` (or `text/plain; charset=utf-8`)

#### Scenario: robots.txt blocks GPTBot
- WHEN the file is fetched
- THEN the body contains a block matching `User-agent: GPTBot` followed (within the same block) by `Disallow: /`

#### Scenario: robots.txt blocks all unknown agents
- WHEN the file is fetched
- THEN the body contains a `User-agent: *` block with `Disallow: /`

### Requirement: HTTP Link header advertises discovery resources

The system SHALL emit an HTTP `Link` response header on application responses that advertises the discoverable agent-facing resources, per [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html) and the recommendation of [RFC 9727 §3](https://www.rfc-editor.org/rfc/rfc9727.html#section-3).

The header MUST include at least the following three link values:
- `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`
- `</llms.txt>; rel="llms-txt"; type="text/plain"`
- `</openapi-mcp.yaml>; rel="service-desc"; type="application/yaml"`

The middleware MUST NOT inject the header on requests whose path starts with `/mcp` (the MCP SDK writes directly to the underlying `ServerResponse`; injecting headers after the SDK has begun writing produces undefined behavior).

If a downstream handler has already set a `Link` header on the response, the middleware MUST merge its values with the existing header (comma-separated per RFC 8288) rather than overwrite it.

#### Scenario: GET / includes the Link header
- WHEN a client sends `GET /`
- THEN the response includes a `Link` header
- AND the header value contains the substring `rel="api-catalog"`

#### Scenario: POST /mcp is not polluted by the middleware
- WHEN a client sends any request whose path starts with `/mcp`
- THEN the response does NOT include a `Link` header injected by this middleware

#### Scenario: Existing Link header is preserved
- GIVEN a downstream handler that has already set `Link: <https://example/x>; rel="alternate"`
- WHEN the middleware runs
- THEN the final `Link` header contains BOTH the original `rel="alternate"` value AND the three discovery values listed above
