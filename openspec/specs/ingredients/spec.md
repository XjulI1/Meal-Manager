# ingredients Specification

## Purpose
Nouveau bounded context gérant le **catalogue d'ingrédients génériques** (référencé par inventory, catalog, shopping) et les **produits achetables** qui matérialisent un ingrédient sous une marque/un conditionnement donné, avec leurs codes-barres.

## Requirements
### Requirement: Creating an Ingredient
The system SHALL allow a household member to create an ingredient in their household catalog.

An ingredient has:
- A non-empty name (1–100 characters), unique per household among non-archived ingredients (case-insensitive).
- A `storage` value: `pantry` or `fridge`.
- A `category` value from the closed set: `produce | dairy | bakery | meat-fish | frozen | grocery | beverages | household | other`.
- A `canonicalUnit` value: `g | ml | unit`.
- Optional `shelfLifeDays` (positive integer).
- Optional `imageUrl` (string, max 500 chars).
- Optional `defaultPackSize` (positive integer, expressed in the canonical unit).
- Optional list of `allergens` (each from the 14 EU allergens set: `gluten | crustaceans | eggs | fish | peanuts | soy | milk | nuts | celery | mustard | sesame | sulphites | lupin | molluscs`).
- Optional list of `aliases` (each a non-empty string, 1–100 characters), unique per ingredient.

#### Scenario: Create an ingredient with minimal fields
- GIVEN an authenticated household member
- WHEN they submit `POST /api/ingredients` with `{ name: "Tomate cerise", storage: "fridge", category: "produce", canonicalUnit: "g" }`
- THEN a new ingredient is created in their household catalog
- AND the system returns HTTP 201 with the created ingredient

#### Scenario: Create with allergens and aliases
- GIVEN an authenticated household member
- WHEN they submit an ingredient with `aliases: ["tomates cerises", "cherry"]` and `allergens: []`
- THEN the ingredient is created with both aliases attached
- AND a subsequent search by either alias returns the ingredient

#### Scenario: Duplicate name in same household
- GIVEN an ingredient named "Tomate" already exists (non-archived) in the household
- WHEN a member submits a second ingredient with name "tomate" (case-insensitive match)
- THEN the system returns HTTP 409 Conflict
- AND no ingredient is created

#### Scenario: Invalid category
- GIVEN an authenticated household member
- WHEN they submit an ingredient with `category: "snacks"` (not in the closed set)
- THEN the system returns HTTP 400 Bad Request
- AND no ingredient is created

#### Scenario: Invalid storage
- GIVEN an authenticated household member
- WHEN they submit an ingredient with `storage: "freezer"`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Invalid canonical unit
- GIVEN an authenticated household member
- WHEN they submit an ingredient with `canonicalUnit: "kg"` (kg is not canonical — it converts to g)
- THEN the system returns HTTP 400 Bad Request

### Requirement: Listing Ingredients
The system SHALL return the list of ingredients belonging to the user's household.

The list MAY be filtered by:
- `?q=<term>`: matches the ingredient name OR any of its aliases (case-insensitive substring).
- `?category=<value>`: returns only ingredients in that category.
- `?storage=pantry|fridge`: returns only ingredients with that storage value.
- `?includeArchived=true`: includes soft-deleted ingredients (default: excluded).

Without filters, all non-archived ingredients of the household are returned, sorted by `category` then `name`.

#### Scenario: List all ingredients
- GIVEN a household with 5 non-archived ingredients
- WHEN a member calls `GET /api/ingredients`
- THEN the system returns the 5 ingredients sorted by category then name

#### Scenario: Search by name
- GIVEN a household with ingredients "Tomate cerise" and "Pomme de terre"
- WHEN a member calls `GET /api/ingredients?q=tom`
- THEN only "Tomate cerise" is returned

#### Scenario: Search matches alias
- GIVEN an ingredient "Tomate cerise" with alias "cherry"
- WHEN a member calls `GET /api/ingredients?q=cherry`
- THEN "Tomate cerise" is returned

#### Scenario: Filter by category
- GIVEN a household with 3 `produce` and 2 `dairy` ingredients
- WHEN a member calls `GET /api/ingredients?category=dairy`
- THEN only the 2 dairy ingredients are returned

#### Scenario: Filter by storage
- GIVEN a household with 4 `pantry` and 3 `fridge` ingredients
- WHEN a member calls `GET /api/ingredients?storage=fridge`
- THEN only the 3 fridge ingredients are returned

#### Scenario: Archived ingredients excluded by default
- GIVEN a household with 2 active and 1 archived (soft-deleted) ingredients
- WHEN a member calls `GET /api/ingredients`
- THEN only the 2 active ingredients are returned

#### Scenario: Archived ingredients on demand
- GIVEN the same household
- WHEN a member calls `GET /api/ingredients?includeArchived=true`
- THEN the 3 ingredients (active + archived) are returned, each with an `archived: true|false` flag

### Requirement: Retrieving an Ingredient
The system SHALL return an ingredient's full details (including aliases and the list of its products) given its id, scoped to the user's household.

#### Scenario: Get ingredient by id
- GIVEN an ingredient with id `ing-123` in the user's household
- WHEN a member calls `GET /api/ingredients/ing-123`
- THEN the system returns the ingredient with all fields, its aliases, and its products (each product including its barcodes)

#### Scenario: Ingredient from another household
- GIVEN an ingredient belonging to household A
- WHEN a member of household B calls `GET /api/ingredients/:id` for that ingredient
- THEN the system returns HTTP 404 Not Found

#### Scenario: Non-existent ingredient
- GIVEN no ingredient with id `does-not-exist`
- WHEN a member calls `GET /api/ingredients/does-not-exist`
- THEN the system returns HTTP 404 Not Found

### Requirement: Updating an Ingredient
The system SHALL allow a household member to update an ingredient belonging to their household.

Updatable fields: `name`, `storage`, `category`, `shelfLifeDays`, `imageUrl`, `defaultPackSize`, `allergens`, `aliases`.

The `canonicalUnit` field is **immutable** once the ingredient has any product or is referenced by any inventory item, recipe ingredient, or shopping list item (changing it would silently invalidate stored quantities). When immutable and a change is requested, the system MUST return HTTP 409 Conflict.

Updating `aliases` replaces the whole alias list atomically.

#### Scenario: Update name
- GIVEN an ingredient `{ id: "ing-1", name: "Tomate" }`
- WHEN a member calls `PATCH /api/ingredients/ing-1` with `{ name: "Tomate cerise" }`
- THEN the ingredient's name is updated

#### Scenario: Update aliases
- GIVEN an ingredient with aliases `["cherry"]`
- WHEN a member calls `PATCH /api/ingredients/:id` with `{ aliases: ["cherry tomato", "tomates cerises"] }`
- THEN the ingredient ends up with exactly the 2 new aliases (the previous one is removed)

#### Scenario: Cannot change canonical unit when in use
- GIVEN an ingredient with `canonicalUnit: "g"` and at least one attached product
- WHEN a member calls `PATCH /api/ingredients/:id` with `{ canonicalUnit: "ml" }`
- THEN the system returns HTTP 409 Conflict
- AND the ingredient is unchanged

### Requirement: Deleting an Ingredient
The system SHALL allow a household member to delete an ingredient belonging to their household.

Deletion rules:
- If the ingredient is **referenced** by any `inventory_item.ingredient_id`, `recipe_ingredient.ingredient_id`, or `shopping_list_item.ingredient_id`, the deletion MUST be a **soft-delete** (sets `deletedAt` to the current time). The referencing rows are NOT modified; the ingredient becomes hidden from default lists but still resolvable by id.
- If the ingredient has **no references**, the deletion MUST be a **hard delete** (row removed). The cascade removes the ingredient's aliases and all its products (and their barcodes).

#### Scenario: Hard delete an unused ingredient
- GIVEN an ingredient with no references anywhere
- WHEN a member calls `DELETE /api/ingredients/:id`
- THEN the ingredient is removed from the database
- AND its aliases and products are removed (cascade)
- AND the system returns HTTP 204 No Content

#### Scenario: Soft delete a referenced ingredient
- GIVEN an ingredient referenced by at least one recipe ingredient
- WHEN a member calls `DELETE /api/ingredients/:id`
- THEN the ingredient's `deletedAt` is set
- AND it no longer appears in `GET /api/ingredients` (without `includeArchived=true`)
- AND the referencing recipe ingredient still resolves to it
- AND the system returns HTTP 204 No Content

#### Scenario: Delete an ingredient from another household
- GIVEN an ingredient belonging to household A
- WHEN a member of household B calls `DELETE /api/ingredients/:id`
- THEN the system returns HTTP 404 Not Found

### Requirement: Adding a Product to an Ingredient
The system SHALL allow a household member to attach a `Product` to an existing ingredient in their household.

A product has:
- A `brand` (optional, 1–100 characters).
- A `packSize` (positive integer) expressed in the ingredient's canonical unit. The submitted `packUnit` MUST equal `ingredient.canonicalUnit`; otherwise HTTP 400.
- An optional `imageUrl` (string, max 500 chars).
- A list of one or more `barcodes` (each a valid EAN-8, EAN-13, or UPC-A — see `Barcode Validation` requirement). UPC-A barcodes MUST be normalized to EAN-13 (prefix `0`) before storage. Each barcode MUST be unique within the household.

#### Scenario: Add a product with one barcode
- GIVEN an ingredient `ing-1` with `canonicalUnit: "g"` in the user's household
- WHEN a member calls `POST /api/ingredients/ing-1/products` with `{ brand: "Panzani", packSize: 500, packUnit: "g", barcodes: ["3038359002564"] }`
- THEN a new product is created attached to `ing-1`
- AND a single `product_barcode` row stores the normalized EAN-13
- AND the system returns HTTP 201 with the created product

#### Scenario: Add a product with multiple barcodes
- GIVEN an ingredient
- WHEN a member submits a product with `barcodes: ["3038359002564", "3038359002571"]`
- THEN both barcodes are attached to the product

#### Scenario: Duplicate barcode in household
- GIVEN a product already exists in the household with barcode `3038359002564`
- WHEN a member submits a new product with the same barcode
- THEN the system returns HTTP 409 Conflict
- AND no product is created

#### Scenario: Pack unit mismatch
- GIVEN an ingredient with `canonicalUnit: "g"`
- WHEN a member submits a product with `packUnit: "ml"`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Invalid barcode checksum
- GIVEN an ingredient
- WHEN a member submits a product with `barcodes: ["3038359002565"]` (last digit wrong)
- THEN the system returns HTTP 400 Bad Request
- AND no product is created

#### Scenario: Product on an ingredient from another household
- GIVEN an ingredient belonging to household A
- WHEN a member of household B calls `POST /api/ingredients/:id/products`
- THEN the system returns HTTP 404 Not Found

### Requirement: Updating a Product
The system SHALL allow a household member to update a product belonging to their household.

Updatable fields: `brand`, `packSize`, `imageUrl`, `barcodes`. The `ingredientId` field and the `packUnit` are immutable (moving a product to another ingredient is forbidden in v1; delete and recreate).

Updating `barcodes` replaces the whole barcode list atomically. Duplicate constraints still apply.

#### Scenario: Update brand and pack size
- GIVEN a product with `brand: "Panzani", packSize: 500`
- WHEN a member calls `PATCH /api/products/:id` with `{ brand: "Barilla", packSize: 1000 }`
- THEN the product is updated

#### Scenario: Replace barcodes
- GIVEN a product with 1 barcode
- WHEN a member submits `{ barcodes: ["3038359002564", "3038359002571"] }`
- THEN the product ends with exactly those 2 barcodes

### Requirement: Deleting a Product
The system SHALL allow a household member to delete (hard-delete) a product belonging to their household.

Deleting a product cascades to its barcodes. Products are never referenced by other entities, so no soft-delete is needed.

#### Scenario: Delete a product
- GIVEN a product `prod-1` in the user's household
- WHEN a member calls `DELETE /api/products/prod-1`
- THEN the product and its barcodes are removed
- AND the system returns HTTP 204 No Content

### Requirement: Resolving an Ingredient by Barcode
The system SHALL allow a household member to look up an ingredient + product pair by scanning a barcode.

The lookup MUST:
1. Normalize the input (trim, pad UPC-A to EAN-13).
2. Search for a `product_barcode` row in the user's household matching the normalized barcode.
3. Return the matched `Product` together with its `Ingredient` (including `name`, `storage`, `canonicalUnit`, `defaultPackSize`).

If no match, the system returns HTTP 404.

#### Scenario: Known barcode
- GIVEN a product with barcode `3038359002564` in the user's household, attached to ingredient `Pâtes`
- WHEN a member calls `GET /api/barcodes/3038359002564`
- THEN the system returns HTTP 200 with `{ ingredient: { id, name: "Pâtes", storage: "pantry", canonicalUnit: "g", defaultPackSize: 500, ... }, product: { id, brand, packSize, ... } }`

#### Scenario: UPC-A normalization
- GIVEN a product stored with EAN-13 `0123456789012` in the user's household
- WHEN a member calls `GET /api/barcodes/123456789012` (12-digit UPC-A)
- THEN the system normalizes to `0123456789012` and returns the matching product

#### Scenario: Unknown barcode
- GIVEN no product with barcode `9999999999991` in the user's household
- WHEN a member calls `GET /api/barcodes/9999999999991`
- THEN the system returns HTTP 404 Not Found

#### Scenario: Barcode known in another household
- GIVEN a product with barcode `3038359002564` exists in household A
- WHEN a member of household B calls `GET /api/barcodes/3038359002564`
- THEN the system returns HTTP 404 Not Found

### Requirement: Barcode Validation
The system MUST validate that any submitted barcode is a syntactically and checksum-valid EAN-8, EAN-13, or UPC-A.

Validation rules:
- A barcode is a string of 8, 12, or 13 digits (no other characters).
- The last digit MUST satisfy the GTIN modulo-10 checksum algorithm.
- UPC-A (12 digits) MUST be normalized to EAN-13 by prefixing `0` before storage.
- After normalization, the stored value is always 8 or 13 digits.

The validation lives in the `Barcode` Value Object in `server/contexts/ingredients/domain/value-objects/`.

#### Scenario: Valid EAN-13
- WHEN `Barcode.fromString("3038359002564")` is called
- THEN it returns a Barcode VO with value `"3038359002564"`

#### Scenario: Valid UPC-A normalized to EAN-13
- WHEN `Barcode.fromString("036000291452")` is called (12 digits, valid UPC checksum)
- THEN it returns a Barcode VO with value `"0036000291452"`

#### Scenario: Valid EAN-8
- WHEN `Barcode.fromString("73513537")` is called
- THEN it returns a Barcode VO with value `"73513537"`

#### Scenario: Invalid length
- WHEN `Barcode.fromString("12345")` is called
- THEN the VO MUST throw `InvalidBarcodeFormatError`

#### Scenario: Non-digit characters
- WHEN `Barcode.fromString("303835900256A")` is called
- THEN the VO MUST throw `InvalidBarcodeFormatError`

#### Scenario: Invalid checksum
- WHEN `Barcode.fromString("3038359002565")` is called (last digit wrong)
- THEN the VO MUST throw `InvalidBarcodeFormatError`

### Requirement: Default Catalog Seed per Household
The system MUST seed a baseline catalog of common French ingredients (~50 entries spanning all categories) into every newly created household.

The seed MUST run as part of the household creation flow, so any member who creates a new household immediately sees a usable starting catalog (with names, storage, category, canonical unit, and where relevant `shelfLifeDays` for fridge items).

The seed MUST NOT create any `Product` rows — only `Ingredient` rows (with `defaultPackSize` set for common cases).

The seed mechanism MUST be exposed as a port `IHouseholdInitializer` (in `server/contexts/family/domain/ports/`) that `family` calls during household creation. Ingredients provides the implementation. This avoids `family` importing from `ingredients`.

#### Scenario: New household receives default ingredients
- GIVEN a user creating a new household
- WHEN the household is created successfully
- THEN at least 30 ingredients are present in the new household's catalog
- AND each ingredient has a valid `category` and `canonicalUnit`

#### Scenario: Seed does not create products
- GIVEN a newly seeded household
- WHEN listing all products in the household
- THEN the list is empty

### Requirement: Domain Isolation
The `server/contexts/ingredients/domain/**` layer MUST NOT import from `drizzle-orm`, `mysql2`, `h3`, `nuxt`, `vue`, or `~/server/database/*`.

External I/O is reached through ports declared in `server/contexts/ingredients/domain/ports/`:
- `IIngredientRepository`
- `IProductRepository`

Implementations live in `server/contexts/ingredients/infrastructure/repositories/` and are wired in `server/plugins/container.ts`.

The composition root MUST register an adapter `IngredientBarcodeResolver` (in `server/contexts/ingredients/infrastructure/`) bound to the `IBarcodeResolver` port declared by the `inventory` context.

#### Scenario: ESLint rule enforces isolation
- GIVEN the existing ESLint config that bans `drizzle-orm` imports under `server/contexts/*/domain/**`
- WHEN any file under `server/contexts/ingredients/domain/**` is added with such an import
- THEN `pnpm lint` MUST fail

#### Scenario: Composition root wiring
- GIVEN the v1 codebase after this change
- WHEN inspecting `server/plugins/container.ts`
- THEN it MUST instantiate `IngredientRepository`, `ProductRepository`, and `IngredientBarcodeResolver`
- AND it MUST register `IngredientBarcodeResolver` as the implementation of `IBarcodeResolver` consumed by inventory use cases
