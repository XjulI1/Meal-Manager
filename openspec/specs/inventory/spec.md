# inventory Specification

## Purpose
TBD - created by archiving change init-meal-manager. Update Purpose after archive.
## Requirements
### Requirement: Adding an Inventory Item
The system SHALL allow a household member to add an item to the household inventory.

An item has:
- An `ingredientId` referencing a non-archived ingredient that belongs to the same household. The field is **required**; HTTP 400 if missing, HTTP 400 if the ingredient is from another household or archived.
- A storage location: `pantry`, `fridge` or `freezer`. The field is **optional** at the API level; if omitted, the system fills it from `ingredient.storage`. A submitted value MAY differ from `ingredient.storage` (legitimate override).
- A quantity (positive number) and a unit. The unit MUST convert to the ingredient's `canonicalUnit`; HTTP 400 otherwise (incompatible dimension).

The quantity MUST be normalized to canonical units (g, ml, unit) before persistence.

The item does NOT carry a free-text name in v1 — the displayed name is always resolved from the referenced ingredient at read time.

**Upsert semantics**: a household MUST have at most one inventory item per `(ingredientId, location)`. When `POST /api/inventory` is called with a `(ingredientId, location)` combination that already has a line:
- The existing line's quantity MUST be incremented by the submitted amount (in canonical unit).
- `updatedAt` MUST be refreshed.
- The system MUST return HTTP **200** with `{ item, created: false }`.

When the combination does not exist:
- A new line MUST be created.
- The system MUST return HTTP **201** with `{ item, created: true }`.

A database `UNIQUE INDEX (household_id, ingredient_id, location)` MUST exist on `inventory_items` as a backstop. If a concurrent insert races and triggers `ER_DUP_ENTRY`, the repository MUST retry the upsert logic once (re-read + increment).

#### Scenario: Add a pantry item for the first time (creation)
- GIVEN an authenticated household member
- AND an ingredient `ing-pasta` with `name: "Pâtes", storage: "pantry", canonicalUnit: "g"` in the household
- AND no existing inventory line for `(ing-pasta, pantry)`
- WHEN they submit `POST /api/inventory` with `{ ingredientId: "ing-pasta", location: "pantry", quantity: 500, unit: "g" }`
- THEN a new inventory item is created in their household
- AND the stored quantity is `{ value: 500, unit: "g" }`
- AND the system returns HTTP 201 with `{ item, created: true }`

#### Scenario: Add to an existing line (increment)
- GIVEN an existing inventory line for `(ing-pasta, pantry)` with quantity `500 g`
- WHEN a member submits `POST /api/inventory` with `{ ingredientId: "ing-pasta", location: "pantry", quantity: 500, unit: "g" }`
- THEN the existing line's quantity becomes `1000 g`
- AND no new line is created
- AND the system returns HTTP 200 with `{ item, created: false }`

#### Scenario: Add to an existing line with unit conversion
- GIVEN an existing line for `(ing-milk, fridge)` with quantity `500 ml`
- WHEN a member submits `POST /api/inventory` with `{ ingredientId: "ing-milk", location: "fridge", quantity: 1, unit: "L" }`
- THEN the existing line's quantity becomes `1500 ml`
- AND `created: false`

#### Scenario: Same ingredient, different location creates a distinct line
- GIVEN an existing line for `(ing-pasta, pantry)` with quantity `500 g`
- WHEN a member submits `POST /api/inventory` with `{ ingredientId: "ing-pasta", location: "fridge", quantity: 100, unit: "g" }`
- THEN a **new** line is created for `(ing-pasta, fridge)` with `100 g`
- AND the pantry line is unchanged
- AND the system returns HTTP 201 with `{ item, created: true }`

#### Scenario: Add an item with location derived from ingredient
- GIVEN an ingredient `ing-milk` with `storage: "fridge", canonicalUnit: "ml"`
- AND no line for `(ing-milk, fridge)`
- WHEN a member submits `POST /api/inventory` with `{ ingredientId: "ing-milk", quantity: 1, unit: "L" }` (no `location`)
- THEN the system fills `location: "fridge"` from the ingredient
- AND the stored quantity is `{ value: 1000, unit: "ml" }`
- AND the system returns HTTP 201

#### Scenario: Concurrent upsert resolved by retry
- GIVEN no existing line for `(ing-pasta, pantry)`
- WHEN two concurrent `POST /api/inventory` requests both with `(ing-pasta, pantry, 500 g)` execute simultaneously
- AND both reach the "create" path before either commits
- THEN the second INSERT triggers `ER_DUP_ENTRY` at the DB level
- AND the repository catches it and retries the upsert
- AND the final state is a single line for `(ing-pasta, pantry)` with quantity `1000 g`
- AND both HTTP responses are successful (one 201 `created: true`, one 200 `created: false`)

#### Scenario: Missing ingredientId
- GIVEN an authenticated household member
- WHEN they submit `POST /api/inventory` without an `ingredientId`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created

#### Scenario: Ingredient from another household
- GIVEN an ingredient belonging to household A
- WHEN a member of household B submits an inventory item with that `ingredientId`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Archived ingredient
- GIVEN an ingredient that has been soft-deleted
- WHEN a member submits a new inventory item with that `ingredientId`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Incompatible unit dimension
- GIVEN an ingredient `ing-pasta` with `canonicalUnit: "g"`
- WHEN a member submits `{ ingredientId: "ing-pasta", quantity: 500, unit: "ml" }`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created or modified

#### Scenario: Invalid quantity
- GIVEN an authenticated household member
- WHEN they submit an item with `quantity <= 0`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created or modified

#### Scenario: Invalid location
- GIVEN an authenticated household member
- WHEN they submit an item with `location` other than `pantry`, `fridge` or `freezer`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created or modified

### Requirement: Listing Inventory Items
The system SHALL return the list of inventory items belonging to the user's household.

The list MAY be filtered by location via query parameter `?location=pantry|fridge|freezer`. Without a filter, all items are returned, grouped or sortable by location.

Each returned item MUST include the resolved ingredient `name` and the ingredient `category` (so the client can render and group without a second request).

#### Scenario: List all items
- GIVEN a household with 3 pantry items and 2 fridge items
- WHEN a member calls `GET /api/inventory`
- THEN the system returns all 5 items
- AND each item includes `id`, `ingredientId`, `name` (resolved from the ingredient), `category` (resolved from the ingredient), `location`, `quantity` (with canonical unit), and `lastUpdate` timestamp

#### Scenario: List only pantry items
- GIVEN the same household
- WHEN a member calls `GET /api/inventory?location=pantry`
- THEN the system returns only the 3 pantry items

### Requirement: Updating an Inventory Item
The system SHALL allow a household member to update an inventory item belonging to their household.

Updatable fields: `location`, `quantity`, `unit`. The `ingredientId` is **immutable** once the item is created (changing the ingredient effectively means deleting the item and creating a new one — explicitly required so the user notices).

When updating `quantity`/`unit`, the unit MUST convert to the ingredient's `canonicalUnit`; HTTP 400 otherwise.

**Location-conflict rule**: when updating `location` to a value where another line already exists for the same `(householdId, ingredientId)`, the system MUST return HTTP 409 Conflict and modify nothing. The user is expected to resolve manually (consume one of the two lines, or transfer the quantity).

#### Scenario: Update quantity
- GIVEN an existing inventory item with ingredient `ing-pasta` and quantity `500 g`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ quantity: 250, unit: "g" }`
- THEN the item's quantity is updated to `250 g`

#### Scenario: Update location to a free location
- GIVEN an existing inventory item for `(ing-pasta, pantry)` and no line for `(ing-pasta, fridge)`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ location: "fridge" }`
- THEN the item's location is updated to `"fridge"`

#### Scenario: Update location collides with an existing line
- GIVEN two inventory lines: `(ing-pasta, pantry)` (500 g) and `(ing-pasta, fridge)` (200 g)
- WHEN a member calls `PATCH /api/inventory/:pantry-id` with `{ location: "fridge" }`
- THEN the system returns HTTP 409 Conflict
- AND both lines are unchanged
- AND the error response indicates the conflict (existing line id, ingredient, target location)

#### Scenario: Cannot change ingredientId
- GIVEN an existing inventory item bound to `ing-pasta`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ ingredientId: "ing-rice" }`
- THEN the system returns HTTP 400 Bad Request (or ignores the field; implementation MUST choose one — v1 returns 400)
- AND the item's ingredient is unchanged

#### Scenario: Incompatible unit on update
- GIVEN an item bound to an ingredient with `canonicalUnit: "g"`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ quantity: 1, unit: "ml" }`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Update of an item from another household
- GIVEN an item belonging to household A
- WHEN a member of household B attempts to update it
- THEN the system returns HTTP 404 Not Found
- AND the item is not modified

### Requirement: Adjusting Quantity (Increment/Decrement)
The system SHALL allow a household member to adjust an item's quantity by a delta (positive or negative).

If the resulting quantity would be zero or negative, the item MUST be removed from the inventory.

#### Scenario: Decrement removes the item when reaching zero
- GIVEN an inventory item with quantity `200 g`
- WHEN a member adjusts the quantity by `-200 g`
- THEN the resulting quantity is `0 g`
- AND the item is removed from the inventory

#### Scenario: Decrement below zero
- GIVEN an inventory item with quantity `200 g`
- WHEN a member adjusts the quantity by `-300 g`
- THEN the system returns HTTP 400 Bad Request
- OR the item is removed and the excess is discarded (implementation MUST choose one and document it; the chosen behaviour for v1 is to clamp to zero and remove the item)

### Requirement: Removing an Inventory Item
The system SHALL allow a household member to remove an inventory item.

#### Scenario: Successful removal
- GIVEN an existing inventory item in the user's household
- WHEN the member calls `DELETE /api/inventory/:id`
- THEN the item is removed
- AND the system returns HTTP 204 No Content

### Requirement: Barcode Resolution Port (future-proofing)
The domain layer MUST define an `IBarcodeResolver` port in `server/contexts/inventory/domain/ports/`.

The port MUST expose a method `resolve(barcode: string): Promise<BarcodeResolution | null>` where `BarcodeResolution` contains at minimum a `name` and optionally a `defaultUnit`, an `ingredientId`, a `productId`, a `storage` value, and a `category`.

```ts
export interface BarcodeResolution {
  name: string;
  defaultUnit?: CanonicalUnit;
  ingredientId?: string;
  productId?: string;
  storage?: 'pantry' | 'fridge' | 'freezer';
  category?: IngredientCategory;
}
```

The composition root MUST register a concrete adapter for this port. The default adapter is `IngredientBarcodeResolver` (provided by the `ingredients` context), which resolves against the household's product catalog. Additional adapters (e.g. external services like OpenFoodFacts) MAY be registered later without changing the domain.

The port and its adapter MUST be reachable by inventory use cases via `event.context.container.barcodeResolver` — inventory use cases MUST NOT import directly from the `ingredients` context.

#### Scenario: Port presence
- GIVEN the v1 codebase
- WHEN the inventory domain is inspected
- THEN the file `server/contexts/inventory/domain/ports/barcode-resolver.ts` exists
- AND it exports the `IBarcodeResolver` interface and the `BarcodeResolution` type with the expected shape

#### Scenario: Adapter wiring
- GIVEN the composition root
- WHEN it is initialized
- THEN it MUST bind `IngredientBarcodeResolver` to the `IBarcodeResolver` port
- AND `event.context.container.barcodeResolver` MUST be defined

#### Scenario: Inventory use case uses the port (no cross-context import)
- GIVEN an inventory use case that consumes barcode resolution
- WHEN inspecting its imports
- THEN it MUST depend only on `IBarcodeResolver` from its own domain layer
- AND it MUST NOT import from `server/contexts/ingredients/**`

### Requirement: Adding an Inventory Item from a Product Scan
The system SHALL expose `POST /api/inventory/from-scan` allowing a household member to create or increment an inventory item from a previously resolved product (typically after a barcode scan).

The request body MUST include:
- `productId` (string, required) referencing a product in the same household.
- `quantity` (object with `value` and `unit`, required). The unit MUST convert to the ingredient's `canonicalUnit`.
- `location` (`pantry | fridge | freezer`, optional). When omitted, the server fills from `ingredient.storage` (resolved via the product).

The use case MUST consult the product through a port `IProductLookup` declared in `server/contexts/inventory/domain/ports/`. The inventory use case MUST NOT import directly from `server/contexts/ingredients/**`. The adapter implementation lives under `server/contexts/ingredients/infrastructure/` and is wired in the composition root.

The same **upsert semantics** as `POST /api/inventory` apply: if a line already exists for the resolved `(ingredientId, location)`, its quantity is incremented; otherwise a new line is created. Response codes follow the same convention (201 if created, 200 if incremented), with `{ item, created: boolean }` in the body.

#### Scenario: Add by scan with defaults (creation)
- GIVEN a product `prod-1` with `packSize: 500, packUnit: "g"` bound to ingredient `ing-pasta` (`storage: "pantry"`)
- AND no existing line for `(ing-pasta, pantry)`
- WHEN a member submits `POST /api/inventory/from-scan` with `{ productId: "prod-1", quantity: { value: 500, unit: "g" } }`
- THEN a new inventory item is created in their household
- AND the item has `ingredientId: "ing-pasta"`, `location: "pantry"`, quantity `{ value: 500, unit: "g" }`
- AND the system returns HTTP 201 with `{ item, created: true }`

#### Scenario: Add by scan increments an existing line
- GIVEN an existing line for `(ing-pasta, pantry)` with quantity `500 g`
- AND a product `prod-1` with `packSize: 500, packUnit: "g"` bound to `ing-pasta` (`storage: "pantry"`)
- WHEN a member submits `POST /api/inventory/from-scan` with `{ productId: "prod-1", quantity: { value: 500, unit: "g" } }`
- THEN the existing line's quantity becomes `1000 g`
- AND the system returns HTTP 200 with `{ item, created: false }`

#### Scenario: Add by scan with explicit location override
- GIVEN a product whose ingredient has `storage: "pantry"`
- AND no line for the same ingredient in `freezer`
- WHEN a member submits `{ productId: "...", quantity: {...}, location: "freezer" }`
- THEN a new line is created with `location: "freezer"`

#### Scenario: Unknown product
- GIVEN no product with id `prod-unknown` in the household
- WHEN a member submits `POST /api/inventory/from-scan` with `{ productId: "prod-unknown", ... }`
- THEN the system returns HTTP 404 Not Found
- AND no inventory line is created or modified

#### Scenario: Product from another household
- GIVEN a product belonging to household A
- WHEN a member of household B submits `POST /api/inventory/from-scan` with that `productId`
- THEN the system returns HTTP 404 Not Found

#### Scenario: Incompatible unit on scan add
- GIVEN a product bound to an ingredient with `canonicalUnit: "g"`
- WHEN a member submits `{ productId: "...", quantity: { value: 1, unit: "L" } }`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: No direct import from ingredients in the use case
- GIVEN the file `server/contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case.ts`
- WHEN inspecting its imports
- THEN it MUST depend only on ports declared under `server/contexts/inventory/domain/ports/`
- AND it MUST NOT import from `server/contexts/ingredients/**`

### Requirement: Consuming Inventory by Barcode
The system SHALL expose `POST /api/inventory/consume-by-barcode` allowing a household member to decrement inventory by scanning a barcode.

The request body MUST include:
- `barcode` (string, required). Validated and normalized via the `Barcode` VO.
- `quantity` (object with `value` and `unit`, required). The unit MUST convert to the ingredient's `canonicalUnit`.
- `preview` (boolean, optional, default false). When true, the system computes the consumption plan but does NOT modify any state.

Resolution and drain order:
1. The barcode is resolved through the `IBarcodeResolver` port (already specified) to obtain a product and its ingredient.
2. All inventory lines in the household with the resolved `ingredientId` are listed and ordered as:
   - The line at `ingredient.storage` (the default storage location) first.
   - Then the other lines by `createdAt ASC`.
3. The requested quantity is drained from the head of the queue. When a line reaches zero, it is removed (consistent with `Adjust Quantity`). Overflow to the next line is allowed.
4. If the total available quantity across all lines is less than the requested quantity, the system returns HTTP 400 and modifies no state.

In `preview` mode, the response is `{ candidates: Array<{ lineId, location, currentQuantity, wouldRemove }>, totalAvailable, fullyConsumed: boolean }`. No state changes.

In normal mode, the response is `{ impactedLines: Array<{ lineId, location, quantityRemoved, remainingQuantity, deleted: boolean }> }`.

The use case MUST consult the existing `IBarcodeResolver` port (already wired). It MUST NOT import from `server/contexts/ingredients/**`.

#### Scenario: Consume from the single default line
- GIVEN one inventory line for `(ing-yogurt, fridge)` with quantity `4 unit` (and `ing-yogurt.storage === "fridge"`)
- AND a product with barcode `1234567890128` bound to `ing-yogurt`
- WHEN a member submits `POST /api/inventory/consume-by-barcode` with `{ barcode: "1234567890128", quantity: { value: 1, unit: "unit" } }`
- THEN the line is updated to `3 unit`
- AND the response is `{ impactedLines: [{ lineId, location: "fridge", quantityRemoved: 1, remainingQuantity: 3, deleted: false }] }`

#### Scenario: Default storage line consumed first
- GIVEN two inventory lines for ingredient `ing-pasta` (`storage: "pantry"`):
  - `(ing-pasta, pantry)`: 500 g
  - `(ing-pasta, fridge)`: 300 g
- WHEN a member submits `{ barcode: "...", quantity: { value: 200, unit: "g" } }`
- THEN the pantry line is decremented to `300 g`
- AND the fridge line is unchanged
- AND the response lists only the pantry line as impacted

#### Scenario: Overflow from default to other locations
- GIVEN two inventory lines for ingredient `ing-pasta` (`storage: "pantry"`):
  - `(ing-pasta, pantry)`: 500 g
  - `(ing-pasta, fridge)`: 300 g
- WHEN a member submits `{ barcode: "...", quantity: { value: 600, unit: "g" } }`
- THEN the pantry line is fully consumed (500 g removed) and deleted from the inventory
- AND the fridge line is decremented by 100 g (now 200 g)
- AND the response lists both impacted lines in order (pantry first, then fridge)

#### Scenario: Insufficient total quantity
- GIVEN lines totalling 4 unit
- WHEN a member requests `{ quantity: { value: 5, unit: "unit" } }`
- THEN the system returns HTTP 400 Bad Request
- AND no line is modified

#### Scenario: Preview mode does not modify state
- GIVEN two lines totalling 6 unit
- WHEN a member submits `{ ..., preview: true, quantity: { value: 5, unit: "unit" } }`
- THEN the system returns the candidate plan with `wouldRemove` per line
- AND no inventory line is modified

#### Scenario: Non-default locations ordered by createdAt
- GIVEN three lines for ingredient `ing-pasta` (`storage: "pantry"`):
  - `(ing-pasta, pantry)`: 100 g, createdAt 2026-01-01
  - `(ing-pasta, freezer)`: 100 g, createdAt 2026-02-01
  - `(ing-pasta, fridge)`: 100 g, createdAt 2026-03-01
- WHEN a member submits `{ ..., quantity: { value: 250, unit: "g" } }`
- THEN the drain order is: pantry first (default), then freezer (older non-default), then fridge
- AND pantry is consumed in full and deleted, freezer is consumed in full and deleted, fridge is decremented by 50 g

#### Scenario: Unknown barcode
- GIVEN no product with the scanned barcode in the household
- WHEN a member submits `POST /api/inventory/consume-by-barcode`
- THEN the system returns HTTP 404 Not Found
- AND no inventory line is modified

#### Scenario: Invalid barcode
- GIVEN a barcode that fails GTIN checksum validation
- WHEN a member submits `POST /api/inventory/consume-by-barcode`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Incompatible unit on consume
- GIVEN a barcode resolving to an ingredient with `canonicalUnit: "g"`
- WHEN a member submits `{ ..., quantity: { value: 1, unit: "L" } }`
- THEN the system returns HTTP 400 Bad Request

### Requirement: Product Lookup Port (Inventory ↔ Ingredients boundary)
The inventory domain MUST define an `IProductLookup` port in `server/contexts/inventory/domain/ports/product-lookup.port.ts` exposing at minimum:

```ts
export interface ProductSummary {
  id: string;
  ingredientId: string;
  packSize: number;
  packUnit: 'g' | 'ml' | 'unit';
}
export interface IProductLookup {
  findById(productId: string, householdId: string): Promise<ProductSummary | null>;
}
```

The composition root MUST register a concrete adapter for this port (provided by the `ingredients` context's infrastructure layer, mirroring the `IngredientLookup` pattern). The implementation MUST enforce household isolation (a product belonging to household A is invisible to household B).

The port and its adapter MUST be reachable by inventory use cases via `event.context.container.productLookup` — inventory use cases MUST NOT import from `server/contexts/ingredients/**`.

#### Scenario: Port presence
- GIVEN the codebase after this change
- WHEN inspecting the inventory domain
- THEN the file `server/contexts/inventory/domain/ports/product-lookup.port.ts` exists
- AND it exports `IProductLookup` and `ProductSummary` with the documented shape

#### Scenario: Adapter wiring
- GIVEN the composition root
- WHEN it is initialized
- THEN it MUST bind a concrete `IProductLookup` implementation (provided by the `ingredients` infrastructure layer)
- AND `event.context.container.productLookup` MUST be defined

#### Scenario: Household isolation enforced
- GIVEN a product `prod-1` belonging to household A
- WHEN a member of household B calls `productLookup.findById("prod-1", "household-B-id")`
- THEN the adapter MUST return `null`

### Requirement: Inventory Uniqueness Constraint
The `inventory_items` table MUST enforce a `UNIQUE` constraint on `(household_id, ingredient_id, location)` at the database level.

This constraint is the backstop that guarantees the upsert semantics of `Adding an Inventory Item` even under concurrent writes.

#### Scenario: Constraint exists in schema
- GIVEN the Drizzle schema after this change
- WHEN inspecting `server/database/schema/inventory-items.ts`
- THEN a unique index named `inventory_items_household_ingredient_location_uq` MUST be declared on `(householdId, ingredientId, location)`

#### Scenario: Constraint is applied to the database
- GIVEN a fresh database after running migrations
- WHEN inspecting the `inventory_items` table indexes
- THEN a unique index MUST exist on `(household_id, ingredient_id, location)`

