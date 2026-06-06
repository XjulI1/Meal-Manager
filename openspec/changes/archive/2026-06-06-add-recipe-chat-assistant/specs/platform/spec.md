## ADDED Requirements

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
