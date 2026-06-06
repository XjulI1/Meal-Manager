# platform Specification

## Purpose
TBD - created by archiving change init-meal-manager. Update Purpose after archive.
## Requirements
### Requirement: User Registration
The system SHALL allow a visitor to create an account using an email address and a password.

The password MUST be at least 12 characters long.
The email MUST be unique across all accounts (case-insensitive).
Passwords MUST be hashed using argon2id before being stored. Plaintext passwords MUST NEVER be persisted or logged.

#### Scenario: Successful registration
- GIVEN a visitor on the registration page
- AND the email `alice@example.com` is not already registered
- WHEN the visitor submits `{ email: "alice@example.com", password: "strongPassword123!" }`
- THEN a new user account is created
- AND the password is stored hashed (argon2id)
- AND a session cookie is issued
- AND the user is redirected to the household onboarding page

#### Scenario: Email already registered
- GIVEN an existing account with email `alice@example.com`
- WHEN a visitor submits a registration with the same email
- THEN the system returns HTTP 409 Conflict
- AND no new account is created
- AND the error message does not reveal whether the email is taken (to limit enumeration; a generic "Registration failed" is returned)

#### Scenario: Password too short
- GIVEN a visitor on the registration page
- WHEN the visitor submits a password of less than 12 characters
- THEN the system returns HTTP 400 Bad Request
- AND no account is created

#### Scenario: Invalid email format
- GIVEN a visitor on the registration page
- WHEN the visitor submits an email that is not a valid email
- THEN the system returns HTTP 400 Bad Request

### Requirement: User Login
The system SHALL allow a registered user to authenticate using email and password.

On successful authentication, a session cookie MUST be issued. The cookie MUST be signed, HTTP-only, and `SameSite=Lax`. It MUST be marked `Secure` when served over HTTPS.

#### Scenario: Valid credentials
- GIVEN a registered user with email `alice@example.com`
- WHEN the user submits valid credentials
- THEN a session cookie is issued
- AND the user is redirected to their main page (inventory if a household exists, onboarding otherwise)

#### Scenario: Invalid credentials
- GIVEN any login attempt with an incorrect password OR an unregistered email
- WHEN the user submits the login form
- THEN the system returns HTTP 401 Unauthorized
- AND the response time is similar to a successful login (to mitigate timing attacks)
- AND the error message is generic ("Invalid email or password")

### Requirement: Session Management
The system MUST manage authenticated sessions via signed cookies.

Sessions MUST be invalidated by an explicit logout endpoint.
Sessions MUST survive server restarts (no in-memory-only storage).
The session secret MUST be loaded from environment variable `NUXT_SESSION_PASSWORD`.

#### Scenario: Logout
- GIVEN an authenticated user
- WHEN the user calls `POST /api/auth/logout`
- THEN the session cookie is cleared
- AND subsequent requests to authenticated routes return HTTP 401

#### Scenario: Access without session
- GIVEN a request to any protected route without a valid session cookie
- WHEN the request reaches the server
- THEN the system returns HTTP 401 Unauthorized
- AND no business logic is executed

### Requirement: Hexagonal Architecture Boundaries
The codebase MUST enforce hexagonal architecture boundaries per bounded context.

The `domain` layer of any bounded context MUST NOT import from `drizzle-orm`, `h3`, `nuxt`, `vue`, or any other framework/infrastructure package.
The `application` layer MUST only depend on `domain` (its own context).
Infrastructure adapters (repositories, HTTP routes) MUST depend on `application` and `domain` through ports.

A linter rule MUST be configured to enforce these boundaries at CI time.

#### Scenario: Domain purity
- GIVEN any file under `server/contexts/*/domain/`
- WHEN the linter runs
- THEN it MUST fail if the file imports from `drizzle-orm`, `mysql2`, `h3`, `#imports`, or any path under `server/database/`

#### Scenario: Dependency direction
- GIVEN any file under `server/contexts/*/infrastructure/`
- WHEN the file uses a repository
- THEN it MUST implement an interface declared in the same context's `domain/ports/`

### Requirement: Dependency Injection via Composition Root
The system MUST instantiate use cases and repositories in a single composition root (`server/plugins/container.ts`).

HTTP route handlers MUST NOT directly instantiate use cases or repositories. They MUST retrieve them from `event.context.container`.

#### Scenario: Container injection
- GIVEN any HTTP route handler under `server/api/`
- WHEN the handler needs a use case
- THEN it retrieves the use case from `event.context.container.<useCaseName>`
- AND it does not call any `new` on a use case or repository class

### Requirement: Quantity Normalization
The system MUST normalize all quantities to canonical units before persistence.

Canonical units:
- Mass: gram (`g`)
- Volume: millilitre (`ml`)
- Discrete: unit (`unit`)

Conversion MUST occur at the DTO ↔ Domain boundary. Domain code MUST manipulate only canonical units.
Two quantities of different dimensions (e.g., mass vs volume) MUST NOT be combined; an attempt MUST raise an `IncompatibleUnitsError`.

#### Scenario: Conversion from user input
- GIVEN a user enters `2 kg` of flour
- WHEN the value is parsed at the API boundary
- THEN it is stored as `{ value: 2000, unit: "g" }` in the domain and the database

#### Scenario: Conversion for display
- GIVEN an inventory item stored as `{ value: 1500, unit: "g" }`
- WHEN it is rendered in the UI
- THEN it MAY be displayed as `1.5 kg` according to display preferences
- AND the underlying stored value remains `1500 g`

#### Scenario: Combining incompatible units
- GIVEN a quantity in `g` and a quantity in `ml`
- WHEN the system attempts to add or subtract them
- THEN an `IncompatibleUnitsError` is raised
- AND no value is produced

### Requirement: Database Migrations on Startup
The Docker container MUST apply pending database migrations before starting the Nuxt server.

#### Scenario: Container startup
- GIVEN a fresh container start
- WHEN the entrypoint script runs
- THEN `drizzle-kit migrate` is executed against the configured `DATABASE_URL`
- AND if migrations fail, the container exits with a non-zero status code
- AND if migrations succeed, the Nuxt server starts

### Requirement: Personal Access Token Issuance

The system SHALL allow an authenticated household member to issue Personal Access Tokens (PATs) for their current household.

A PAT has:
- A `name` (1–80 characters) chosen by the user (e.g. "Claude Desktop", "Home Assistant").
- An immutable binding to `(userId, householdId)` recorded at issuance time.
- A plaintext value of the form `mm_pat_<22 base64url characters>` returned **once** in the creation response.
- Only the SHA-256 hash of the plaintext is persisted; the plaintext is NEVER stored, logged, or returned again.
- An 8-character `prefix` derived from the plaintext (after the `mm_pat_` marker), persisted in clear so the UI can disambiguate tokens to the user.

The user MUST currently be a member of a household to issue a PAT.

#### Scenario: Successful issuance
- GIVEN an authenticated user who is a member of household `hh-1`
- WHEN they submit `POST /api/me/tokens` with `{ name: "Claude Desktop" }`
- THEN a new PAT is created, bound to `(this user, hh-1)`
- AND the response contains the plaintext `mm_pat_<22 chars>` and the token view (id, name, prefix, createdAt)
- AND the database stores only the SHA-256 hash of the plaintext

#### Scenario: Issuance without household
- GIVEN an authenticated user who is NOT in any household
- WHEN they submit `POST /api/me/tokens` with `{ name: "X" }`
- THEN the system returns HTTP 403 Forbidden
- AND no PAT is created

#### Scenario: Issuance with invalid name
- GIVEN an authenticated household member
- WHEN they submit `POST /api/me/tokens` with `{ name: "" }` (or > 80 chars)
- THEN the system returns HTTP 400 Bad Request
- AND no PAT is created

#### Scenario: Plaintext never returned again
- GIVEN a PAT that was issued earlier
- WHEN the user calls `GET /api/me/tokens`
- THEN the response contains only views (id, name, prefix, createdAt, lastUsedAt, revokedAt)
- AND the plaintext is NOT present in the response

### Requirement: Personal Access Token Authentication

The system SHALL accept a Personal Access Token as a `Bearer` credential in the `Authorization` header for routes that require PAT-based authentication.

On successful authentication, the system MUST resolve the request to the `(userId, householdId)` pair bound to that PAT.
On failure (missing, malformed, unknown, or revoked token), the system MUST return HTTP 401 with a `WWW-Authenticate: Bearer realm="meal-manager-mcp"` response header.

#### Scenario: Valid Bearer token
- GIVEN an active PAT bound to `(user-1, hh-1)` with plaintext `mm_pat_AbCdEf...`
- WHEN a request to a PAT-authenticated route includes header `Authorization: Bearer mm_pat_AbCdEf...`
- THEN the request is authorized as `(user-1, hh-1)`
- AND the token's `lastUsedAt` is updated

#### Scenario: Missing Authorization header
- GIVEN a request to a PAT-authenticated route
- WHEN no `Authorization` header is present
- THEN the system returns HTTP 401
- AND the response includes header `WWW-Authenticate: Bearer realm="meal-manager-mcp"`

#### Scenario: Revoked token
- GIVEN a PAT that was revoked
- WHEN a request includes that PAT in `Authorization: Bearer`
- THEN the system returns HTTP 401
- AND no business logic is executed

#### Scenario: Unknown token
- GIVEN a request with `Authorization: Bearer mm_pat_unknown000000000000`
- WHEN the system processes the request
- THEN the system returns HTTP 401

#### Scenario: Authentication failure does not reveal token presence
- GIVEN any 401 response (revoked, unknown, malformed)
- WHEN the client inspects the response
- THEN the error message is generic and does NOT distinguish between "unknown" and "revoked"

### Requirement: Personal Access Token Listing and Revocation

The system SHALL allow the owner of a PAT to list their own active and revoked tokens and to revoke any of them.

A user MUST NOT be able to view or revoke another user's PATs, even within the same household.

#### Scenario: List own tokens
- GIVEN a user with 2 active PATs and 1 revoked PAT
- WHEN they call `GET /api/me/tokens`
- THEN the response contains the 3 token views sorted by `createdAt` descending
- AND each view contains `{ id, name, prefix, createdAt, lastUsedAt, revokedAt }`
- AND no hash or plaintext is included

#### Scenario: Revoke own token
- GIVEN a user owns a PAT with id `tok-1`
- WHEN they call `DELETE /api/me/tokens/tok-1`
- THEN the system returns HTTP 204
- AND the token's `revokedAt` is set
- AND subsequent Bearer authentication with that token returns HTTP 401

#### Scenario: Revoke another user's token
- GIVEN user A owns PAT `tok-A` ; user B is authenticated
- WHEN user B calls `DELETE /api/me/tokens/tok-A`
- THEN the system returns HTTP 404 (does NOT reveal whether the id exists)
- AND `tok-A` is NOT revoked

#### Scenario: Revoke already-revoked token
- GIVEN a PAT already revoked
- WHEN its owner calls `DELETE /api/me/tokens/<id>` again
- THEN the system returns HTTP 204 (idempotent)

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

### Requirement: AI Feature Access Control

The system SHALL gate access to AI-powered features behind a per-account flag.

Each user account carries a boolean `aiEnabled` flag. The flag MUST default to `false` for every newly created account, so AI features are **off by default** and incur no usage cost until explicitly enabled.

Server endpoints that consume the Anthropic API (e.g. the recipe chat and recipe import endpoints) MUST verify the caller's `aiEnabled` flag — via a shared authorization helper, composed with household scoping — and MUST return HTTP 403 when the flag is `false`, without calling the Anthropic API.

In v1 the flag is administrative: it is toggled directly in the database (seed or `db:studio`). There is no self-service activation UI; exposing an admin UI MAY come later.

The client SHALL hide or disable AI entry points (e.g. the recipe chat) when the authenticated account does not have AI enabled.

#### Scenario: New accounts have AI disabled by default
- GIVEN a visitor registers a new account
- WHEN the account is created
- THEN its `aiEnabled` flag is `false`

#### Scenario: AI endpoint denied when flag is disabled
- GIVEN an authenticated user whose account has `aiEnabled = false`
- WHEN the user calls an AI-gated endpoint (e.g. `POST /api/recipes/chat`)
- THEN the system returns HTTP 403
- AND the Anthropic API is not called

#### Scenario: AI endpoint allowed when flag is enabled
- GIVEN an authenticated user whose account has `aiEnabled = true`
- AND who is a member of the target household
- WHEN the user calls an AI-gated endpoint
- THEN the request passes the AI access check and proceeds

#### Scenario: Flag toggled via the database
- GIVEN an existing account with `aiEnabled = false`
- WHEN an operator sets `aiEnabled = true` in the database
- THEN the user gains access to AI features on subsequent requests
- AND no application code change or redeploy is required

#### Scenario: Client hides AI entry points when disabled
- GIVEN an authenticated user whose account has AI disabled
- WHEN they load a page that would otherwise expose the recipe chat
- THEN the AI entry point is hidden or disabled

