## ADDED Requirements

### Requirement: Import a Recipe from Photos

The system SHALL allow an authenticated household member with AI enabled to import a recipe from **one or more photos** via `POST /api/recipes/import-photo`.

The caller MAY attach between 1 and a bounded maximum number of images of the **same** recipe (e.g. front/back of a card, a two-page book spread, an ingredients photo plus a steps photo). The importer MUST interpret all provided images **together** as a single recipe using the Anthropic Claude vision API, and produce a recipe draft (same shape as "Producing a Recipe Draft"). Because the recipe does not come from the web, the draft's source URL is left empty.

The endpoint MUST be scoped to the caller's household (via `requireHouseholdMember()`) and MUST be gated by the caller's AI access (see the `platform` capability — HTTP 403 when AI is disabled for the account).

The endpoint MUST validate inbound images at the boundary: it MUST reject (HTTP 400) a request with zero images, more than the allowed maximum, an unsupported media type (only JPEG, PNG and WebP are accepted), or an image exceeding the allowed size. Validation failures MUST NOT call the Anthropic API.

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

#### Scenario: AI disabled blocks the photo import
- **GIVEN** an authenticated household member whose account has AI disabled (default)
- **WHEN** they call `POST /api/recipes/import-photo`
- **THEN** the system returns HTTP 403
- **AND** no call is made to the Anthropic API

#### Scenario: Unauthenticated request is rejected
- **GIVEN** a request without a valid session
- **WHEN** it calls `POST /api/recipes/import-photo`
- **THEN** the system returns HTTP 401
