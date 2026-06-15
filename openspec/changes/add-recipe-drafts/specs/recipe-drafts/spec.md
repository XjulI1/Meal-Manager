## ADDED Requirements

### Requirement: Persisting a Recipe Draft

The system SHALL allow an authenticated household member to persist a **recipe draft** scoped to their household via `POST /api/recipes/drafts`.

A recipe draft is a deliberately permissive, work-in-progress recipe. Unlike a published recipe, every field is optional and ingredients are kept as **free text** (not yet resolved against the catalog):
- An optional `title` (when present, 1–200 characters)
- Optional free-form `instructions` (when present, ≤ 10 000 characters)
- An optional `servings` count (when present, integer 1–50)
- A list of 0 to 100 draft ingredients, each with a free-text `name` (1–200), an optional quantity (`value` + free-text `unit` ≤ 40 characters) and optionally the `raw` text it was parsed from (≤ 300)
- An optional `sourceUrl` (≤ 2000 characters)
- A required `source` recording its origin (see "Recording the Draft Origin")

Draft ingredient quantities are NOT normalized to canonical units at this stage; normalization happens only when the draft is promoted to a recipe. A draft is never read by the menu or shopping-list features.

The draft belongs to the household, not to the individual member: any member of the household can read, update and delete it.

#### Scenario: Save a manual draft with partial content
- GIVEN an authenticated household member
- WHEN they submit `POST /api/recipes/drafts` with `{ "source": "manual", "title": "Tarte aux pommes", "ingredients": [{ "name": "pommes" }] }`
- THEN a new recipe draft is created in their household with `source: "manual"`
- AND the response is HTTP 201 with the draft view including a generated `id`, `createdAt` and `updatedAt`

#### Scenario: Save a draft with no title and free-text ingredient quantities
- GIVEN an authenticated household member
- WHEN they submit `POST /api/recipes/drafts` with `{ "source": "manual", "ingredients": [{ "name": "ail", "quantity": { "value": 2, "unit": "gousses" }, "raw": "2 gousses d'ail" }] }`
- THEN the draft is created and the free-text unit `"gousses"` is preserved as-is
- AND no conversion to a canonical unit is attempted

#### Scenario: Reject an oversized title
- GIVEN an authenticated household member
- WHEN they submit a draft whose `title` exceeds 200 characters
- THEN the response is HTTP 400 and no draft is created

### Requirement: Recording the Draft Origin

Every recipe draft SHALL carry a `source` enum value among `manual`, `ai-chat`, `ai-url`, `ai-photo`, `mcp`. The `source` is set at creation by the entry point (HTTP route or MCP tool) and is **immutable** thereafter.

The 3 AI modes (conversational chat, URL import, photo import) remain ephemeral producers and SHALL NOT persist drafts themselves; persisting AI-produced content is an explicit subsequent call to `POST /api/recipes/drafts` carrying the corresponding `source`.

#### Scenario: Persist content produced by the AI chat assistant
- GIVEN an authenticated household member with AI enabled who obtained draft content from `POST /api/recipes/chat`
- WHEN they submit that content to `POST /api/recipes/drafts` with `"source": "ai-chat"`
- THEN the draft is persisted with `source: "ai-chat"`

#### Scenario: Persist content imported from a URL keeps its source URL
- GIVEN draft content obtained from `POST /api/recipes/import` for a given page
- WHEN it is saved with `"source": "ai-url"` and the page's `sourceUrl`
- THEN the persisted draft has `source: "ai-url"` and retains the `sourceUrl`

#### Scenario: Source cannot be changed by an update
- GIVEN an existing draft with `source: "ai-photo"`
- WHEN a member sends `PATCH /api/recipes/drafts/:id` attempting to set `"source": "manual"`
- THEN the persisted `source` remains `ai-photo` (the field is ignored or rejected)

#### Scenario: Unknown source value is rejected
- GIVEN an authenticated household member
- WHEN they submit `POST /api/recipes/drafts` with `"source": "imported"`
- THEN the response is HTTP 400 and no draft is created

### Requirement: Listing Recipe Drafts

The system SHALL allow an authenticated household member to list their household's recipe drafts via `GET /api/recipes/drafts`, ordered by most recently updated first.

Each list entry SHALL be a lightweight summary (at least `id`, `title`, `source`, `updatedAt`) and SHALL contain only drafts of the caller's household.

#### Scenario: List returns only the household's drafts
- GIVEN member of household `hh-1` with two drafts, and household `hh-2` with one draft
- WHEN the `hh-1` member calls `GET /api/recipes/drafts`
- THEN the response contains exactly the two `hh-1` drafts
- AND never the `hh-2` draft

#### Scenario: Drafts are ordered by most recently updated
- GIVEN two drafts where draft B was updated after draft A
- WHEN the member lists drafts
- THEN draft B appears before draft A

### Requirement: Retrieving a Recipe Draft

The system SHALL allow an authenticated household member to retrieve a single draft of their household via `GET /api/recipes/drafts/:id`, returning the full draft (content + `source` + timestamps).

#### Scenario: Get a draft by id
- GIVEN a draft `draft-1` belonging to the caller's household
- WHEN they call `GET /api/recipes/drafts/draft-1`
- THEN the response is HTTP 200 with the full draft view

#### Scenario: Draft from another household is not found
- GIVEN a draft `draft-x` belonging to another household
- WHEN the member calls `GET /api/recipes/drafts/draft-x`
- THEN the response is HTTP 404

### Requirement: Updating a Recipe Draft

The system SHALL allow an authenticated household member to update a draft of their household via `PATCH /api/recipes/drafts/:id` (autosave), accepting a partial body. Updatable fields are `title`, `instructions`, `servings`, `ingredients`, `sourceUrl`. The `source` and `id` are not updatable. Updating SHALL refresh `updatedAt` and atomically replace the ingredient list when provided.

#### Scenario: Autosave updates title and ingredients
- GIVEN a draft `draft-1` of the caller's household
- WHEN they `PATCH /api/recipes/drafts/draft-1` with `{ "title": "Tarte fine", "ingredients": [{ "name": "pâte" }, { "name": "pommes" }] }`
- THEN the draft's title becomes `"Tarte fine"`, its ingredients are replaced, and `updatedAt` is refreshed

#### Scenario: Updating a draft of another household is not found
- GIVEN a draft belonging to another household
- WHEN the member sends a `PATCH` for it
- THEN the response is HTTP 404 and nothing is modified

### Requirement: Deleting a Recipe Draft

The system SHALL allow an authenticated household member to delete a draft of their household via `DELETE /api/recipes/drafts/:id`. Deleting a draft has no side effect on published recipes, menus or shopping lists.

#### Scenario: Delete a draft
- GIVEN a draft `draft-1` of the caller's household
- WHEN they call `DELETE /api/recipes/drafts/draft-1`
- THEN the draft is removed and subsequent `GET /api/recipes/drafts/draft-1` returns HTTP 404

#### Scenario: Deleting a draft of another household is not found
- GIVEN a draft belonging to another household
- WHEN the member sends a `DELETE` for it
- THEN the response is HTTP 404

### Requirement: Per-Household Draft Limit

The system SHALL cap the number of active recipe drafts per household at `RECIPE_DRAFTS_MAX_PER_HOUSEHOLD`. A creation that would exceed the cap SHALL be rejected without creating the draft.

#### Scenario: Creating beyond the cap is rejected
- GIVEN a household already holding `RECIPE_DRAFTS_MAX_PER_HOUSEHOLD` drafts
- WHEN a member submits `POST /api/recipes/drafts`
- THEN the response is HTTP 409 with an explanatory error
- AND no new draft is created

### Requirement: Promoting a Draft to a Recipe

The system SHALL support promoting a draft into a published recipe by **reusing the existing flow**: resolving the draft's free-text ingredients against the catalog (`POST /api/recipes/draft/resolve`), creating any confirmed new ingredients, then creating the recipe via `POST /api/recipes`. No dedicated promotion endpoint is introduced in v1. Once the recipe is created, the client SHALL delete the draft via `DELETE /api/recipes/drafts/:id`.

Drafts SHALL NOT bypass the published-recipe invariants: a recipe created from a draft MUST still satisfy all `Creating a Recipe` rules (≥ 1 resolved ingredient, canonical units, required title/instructions/servings).

#### Scenario: Promote a draft via the existing resolve + create flow
- GIVEN a draft with free-text ingredients including one matching the catalog and one new ingredient
- WHEN the member resolves it, confirms the new ingredient, and submits `POST /api/recipes`
- THEN a published recipe is created with all ingredients referenced by `ingredientId` in canonical units
- AND the member deletes the draft, which then returns HTTP 404 on retrieval

#### Scenario: A draft that violates recipe invariants cannot be promoted as-is
- GIVEN a draft with no ingredients
- WHEN the member attempts to create a recipe from it via `POST /api/recipes`
- THEN the create-recipe flow rejects it (HTTP 400, ≥ 1 ingredient required)
- AND the draft itself remains saved and unchanged
