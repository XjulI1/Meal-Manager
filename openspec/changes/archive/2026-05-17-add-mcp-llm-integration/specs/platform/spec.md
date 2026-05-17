# Delta for Platform

Ajout du flux **Personal Access Token (PAT)** : tokens longue durée révocables permettant à un client non-navigateur (LLM, script, intégration) d'agir au nom d'un membre dans le contexte d'un foyer précis.

## ADDED Requirements

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
