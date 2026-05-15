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

