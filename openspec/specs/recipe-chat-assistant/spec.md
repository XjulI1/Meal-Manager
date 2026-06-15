# recipe-chat-assistant Specification

## Purpose
TBD - created by archiving change add-recipe-chat-assistant. Update Purpose after archive.
## Requirements
### Requirement: Conversational Recipe Assistant

The system SHALL provide an authenticated household member with a conversational assistant that helps find or co-build recipes, powered by the Anthropic Claude API.

The assistant endpoint MUST be scoped to the caller's household (via `requireHouseholdMember()`) and MUST be gated by the caller's AI access (see the `platform` capability — HTTP 403 when AI is disabled for the account).

The conversation is **stateless server-side in v1**: the client sends the full message history on each turn; the server does not persist conversation history.

The assistant MAY use Anthropic's server-side web search tool to find recipes on the internet. When it uses information from the web, the assistant SHALL surface the source(s) it relied on.

Responses MUST be streamed to the client (Server-Sent Events) so partial output is visible during generation.

The assistant MUST NOT create, modify, or delete any recipe or inventory data. Its only output is conversational text and, when a recipe is ready, a structured recipe draft (see "Producing a Recipe Draft").

#### Scenario: Member converses to build a recipe
- GIVEN an authenticated household member whose account has AI enabled
- WHEN they send `POST /api/recipes/chat` with a message history asking for a pasta recipe
- THEN the response is streamed (SSE)
- AND the assistant replies with conversational text
- AND no recipe is persisted as a result of the exchange

#### Scenario: Assistant searches the web and cites sources
- GIVEN an authenticated household member with AI enabled
- WHEN they ask the assistant to find a recipe "from a well-known cooking site"
- THEN the assistant MAY perform a web search
- AND when it uses web content, the streamed response includes the source reference(s) it relied on

#### Scenario: AI disabled blocks the chat
- GIVEN an authenticated household member whose account has AI disabled (default)
- WHEN they call `POST /api/recipes/chat`
- THEN the system returns HTTP 403
- AND no call is made to the Anthropic API

#### Scenario: Unauthenticated request is rejected
- GIVEN a request without a valid session
- WHEN it calls `POST /api/recipes/chat`
- THEN the system returns HTTP 401

### Requirement: Producing a Recipe Draft

When the conversation has converged on a concrete recipe, the assistant SHALL emit a structured **recipe draft** rather than persisting anything.

A recipe draft contains:
- A title
- Free-form instructions
- An optional servings count
- A list of ingredient drafts, each with a free-text `name`, an optional quantity (value + unit), and optionally the raw text it was parsed from
- An optional source URL when the recipe came from the web

The recipe draft is returned to the client so it can pre-fill the existing recipe form. Persistence happens only through the existing recipe-creation flow after the user reviews and confirms.

#### Scenario: Assistant emits a draft when the recipe is ready
- GIVEN an ongoing conversation where the user has agreed on a recipe
- WHEN the assistant determines the recipe is complete
- THEN it returns a structured recipe draft (title, instructions, optional servings, ingredient drafts with names and quantities)
- AND the draft is NOT persisted automatically

#### Scenario: Draft pre-fills the form, not the database
- GIVEN a recipe draft returned by the assistant
- WHEN the client receives it
- THEN it uses the draft to pre-fill the recipe form for review
- AND a recipe is created only when the user submits the existing create-recipe flow

### Requirement: Import a Recipe from a URL

The system SHALL allow an authenticated household member with AI enabled to import a recipe from a pasted URL via `POST /api/recipes/import`.

The importer MUST first attempt to parse structured data from the page (JSON-LD / schema.org `Recipe`). If no usable structured data is present, it MAY fall back to extraction by Claude. The result is a recipe draft (same shape as "Producing a Recipe Draft"), including the source URL.

This endpoint MUST be scoped to the household and gated by AI access (HTTP 403 when disabled).

#### Scenario: Import from a page with JSON-LD Recipe data
- GIVEN an authenticated household member with AI enabled
- AND a URL whose page contains a valid schema.org `Recipe` JSON-LD block
- WHEN they call `POST /api/recipes/import` with that URL
- THEN the system returns a recipe draft populated from the structured data
- AND the draft includes the source URL

#### Scenario: Fallback extraction when no structured data
- GIVEN a URL whose page has no usable `Recipe` structured data
- WHEN the member imports it
- THEN the system falls back to Claude-based extraction
- AND returns a recipe draft (which the user reviews before saving)

#### Scenario: Invalid or unreachable URL
- GIVEN a malformed or unreachable URL
- WHEN the member calls `POST /api/recipes/import`
- THEN the system returns HTTP 400 with an explanatory error
- AND no recipe is created

#### Scenario: AI disabled blocks the import
- GIVEN an authenticated household member with AI disabled
- WHEN they call `POST /api/recipes/import`
- THEN the system returns HTTP 403

### Requirement: Resolve Draft Ingredients Against the Catalog

The system SHALL resolve the free-text ingredient names of a recipe draft against the household's ingredient catalog before the recipe can be saved.

Resolution MUST normalize names (trimmed, case-insensitive) and match them to existing non-archived ingredients of the household. For each draft ingredient the result SHALL indicate either:
- a **match** (the resolved `ingredientId`), or
- a **proposed new ingredient** (the normalized name and a suggested canonical unit derived from the draft quantity's dimension), to be confirmed by the user.

The resolution step MUST NOT create ingredients on its own; new ingredients are created only after the user confirms, through the existing ingredient-creation flow.

Quantities MUST be expressed so they can be normalized to canonical units (g, ml, unit) when the recipe is finally created.

#### Scenario: Draft ingredient matches an existing catalog entry
- GIVEN a recipe draft containing the ingredient name "Beurre"
- AND the household catalog contains a non-archived ingredient "beurre"
- WHEN the draft is resolved
- THEN the result maps that draft ingredient to the existing ingredient's `ingredientId`

#### Scenario: Unmatched ingredient is proposed for creation
- GIVEN a recipe draft containing "gingembre frais" with a quantity in grams
- AND no matching ingredient exists in the household catalog
- WHEN the draft is resolved
- THEN the result includes a proposed new ingredient with the normalized name and a suggested canonical unit of `g`
- AND no ingredient is created until the user confirms

#### Scenario: Confirmed new ingredients enable saving via the existing flow
- GIVEN a resolved draft with one matched ingredient and one confirmed new ingredient
- WHEN the user confirms and submits the recipe form
- THEN the new ingredient is created through the existing ingredient-creation flow
- AND the recipe is created through the existing create-recipe flow with all ingredients referenced by `ingredientId`

### Requirement: Import a Recipe from Photos

The system SHALL allow an authenticated household member with AI enabled to import a recipe from **one or more photos** via `POST /api/recipes/import-photo`.

The caller MAY attach between 1 and a bounded maximum number of images of the **same** recipe (e.g. front/back of a card, a two-page book spread, an ingredients photo plus a steps photo). The importer MUST interpret all provided images **together** as a single recipe using the Anthropic Claude vision API, and produce a recipe draft (same shape as "Producing a Recipe Draft"). Because the recipe does not come from the web, the draft's source URL is left empty.

The endpoint MUST be scoped to the caller's household (via `requireHouseholdMember()`) and MUST be gated by the caller's AI access (see the `platform` capability — HTTP 403 when AI is disabled for the account).

The endpoint MUST validate inbound images at the boundary: it MUST reject (HTTP 400) a request with zero images, more than the allowed maximum, an unsupported media type (only JPEG, PNG and WebP are accepted), or an image exceeding the allowed size. Validation failures MUST NOT call the Anthropic API.

Because the Anthropic vision API does not accept HEIC/HEIF (the default iPhone camera format), the client SHALL convert HEIC/HEIF photos to JPEG before upload, so the endpoint only ever receives the accepted media types.

The importer MUST NOT create, modify, or delete any recipe or inventory data. Its only output is a structured recipe draft, which the client uses to pre-fill the existing recipe form (followed by the existing ingredient-resolution flow). Persistence happens only through the existing recipe-creation flow after the user reviews and confirms.

#### Scenario: Import from a single photo
- **GIVEN** an authenticated household member whose account has AI enabled
- **WHEN** they call `POST /api/recipes/import-photo` with one readable photo of a recipe
- **THEN** the system interprets the image via Claude vision
- **AND** returns a recipe draft (title, instructions, optional servings, ingredient drafts with names and quantities)
- **AND** the draft is NOT persisted automatically

#### Scenario: Import from multiple photos of the same recipe
- **GIVEN** an authenticated household member with AI enabled
- **WHEN** they call `POST /api/recipes/import-photo` with several photos covering one recipe (e.g. ingredients on one image, steps on another)
- **THEN** the system interprets all images together as a single recipe
- **AND** returns one consolidated recipe draft

#### Scenario: Draft pre-fills the form and goes through ingredient resolution
- **GIVEN** a recipe draft returned from a photo import
- **WHEN** the client receives it
- **THEN** it resolves the draft ingredients against the household catalog (existing flow)
- **AND** uses the result to pre-fill the recipe form for review
- **AND** a recipe is created only when the user submits the existing create-recipe flow

#### Scenario: No image provided is rejected
- **GIVEN** an authenticated household member with AI enabled
- **WHEN** they call `POST /api/recipes/import-photo` with no image
- **THEN** the system returns HTTP 400 with an explanatory error
- **AND** no call is made to the Anthropic API

#### Scenario: Too many images or unsupported media is rejected
- **GIVEN** an authenticated household member with AI enabled
- **WHEN** they call `POST /api/recipes/import-photo` with more images than allowed, an oversized image, or an unsupported media type (e.g. a PDF)
- **THEN** the system returns HTTP 400 with an explanatory error
- **AND** no call is made to the Anthropic API

#### Scenario: HEIC photo from an iPhone is accepted via client-side conversion
- **GIVEN** an authenticated household member with AI enabled
- **WHEN** they select a HEIC/HEIF photo of a recipe
- **THEN** the client converts it to JPEG before upload
- **AND** the endpoint receives an accepted media type and proceeds with the import

#### Scenario: AI disabled blocks the photo import
- **GIVEN** an authenticated household member whose account has AI disabled (default)
- **WHEN** they call `POST /api/recipes/import-photo`
- **THEN** the system returns HTTP 403
- **AND** no call is made to the Anthropic API

#### Scenario: Unauthenticated request is rejected
- **GIVEN** a request without a valid session
- **WHEN** it calls `POST /api/recipes/import-photo`
- **THEN** the system returns HTTP 401

