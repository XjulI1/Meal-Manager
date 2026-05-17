## MODIFIED Requirements

### Requirement: Adding an Inventory Item
The system SHALL allow a household member to add an item to the household inventory.

An item has:
- An `ingredientId` referencing a non-archived ingredient that belongs to the same household. The field is **required**; HTTP 400 if missing, HTTP 400 if the ingredient is from another household or archived.
- A storage location: `pantry`, `fridge` or `freezer`. The field is **optional** at the API level; if omitted, the system fills it from `ingredient.storage`. A submitted value MAY differ from `ingredient.storage` (legitimate override).
- A quantity (positive number) and a unit. The unit MUST convert to the ingredient's `canonicalUnit`; HTTP 400 otherwise (incompatible dimension).
- An **optional** `expirationDate` (ISO date `YYYY-MM-DD`). If omitted and the ingredient has a `shelfLifeDays`, the system MUST compute `expirationDate = today + ingredient.shelfLifeDays` server-side. If omitted and the ingredient has no `shelfLifeDays`, the item is stored with `expirationDate = NULL` (DLC unknown).

The quantity MUST be normalized to canonical units (g, ml, unit) before persistence.

The item does NOT carry a free-text name in v1 — the displayed name is always resolved from the referenced ingredient at read time.

#### Scenario: Add a pantry item with explicit location
- GIVEN an authenticated household member
- AND an ingredient `ing-pasta` with `name: "Pâtes", storage: "pantry", canonicalUnit: "g"` in the household
- WHEN they submit `POST /api/inventory` with `{ ingredientId: "ing-pasta", location: "pantry", quantity: 500, unit: "g" }`
- THEN a new inventory item is created in their household
- AND the stored quantity is `{ value: 500, unit: "g" }`
- AND the item is associated with `location: "pantry"`

#### Scenario: Add an item with location derived from ingredient
- GIVEN an ingredient `ing-milk` with `storage: "fridge", canonicalUnit: "ml"`
- WHEN a member submits `POST /api/inventory` with `{ ingredientId: "ing-milk", quantity: 1, unit: "L" }` (no `location`)
- THEN the system fills `location: "fridge"` from the ingredient
- AND the stored quantity is `{ value: 1000, unit: "ml" }`

#### Scenario: Add with explicit unit conversion
- GIVEN an ingredient `ing-pasta` with `canonicalUnit: "g"`
- WHEN a member submits `{ ingredientId: "ing-pasta", quantity: 1, unit: "kg" }`
- THEN the stored quantity is `{ value: 1000, unit: "g" }`

#### Scenario: Override the default storage
- GIVEN an ingredient `ing-pasta` with `storage: "pantry"`
- WHEN a member submits an item with `{ ingredientId: "ing-pasta", location: "fridge", quantity: 500, unit: "g" }`
- THEN the item is created with `location: "fridge"` (the override is accepted)

#### Scenario: Add with explicit expirationDate
- GIVEN an authenticated household member
- AND an ingredient `ing-yogurt` with `canonicalUnit: "g"` and `shelfLifeDays: 21`
- WHEN they submit `POST /api/inventory` with `{ ingredientId: "ing-yogurt", quantity: 125, unit: "g", expirationDate: "2026-06-30" }`
- THEN the item is stored with `expirationDate = 2026-06-30` (the explicit value wins)

#### Scenario: ExpirationDate auto-computed from shelfLifeDays
- GIVEN an ingredient `ing-yogurt` with `shelfLifeDays: 21`
- AND the current date is 2026-05-17
- WHEN a member submits `POST /api/inventory` with `{ ingredientId: "ing-yogurt", quantity: 125, unit: "g" }` (no `expirationDate`)
- THEN the system computes and stores `expirationDate = 2026-06-07`

#### Scenario: ExpirationDate left NULL when ingredient has no shelfLifeDays
- GIVEN an ingredient `ing-flour` with `shelfLifeDays: null`
- WHEN a member submits an item without `expirationDate`
- THEN the item is stored with `expirationDate = NULL`
- AND list endpoints return `expirationDate: null` for that item

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
- AND no item is created

#### Scenario: Invalid quantity
- GIVEN an authenticated household member
- WHEN they submit an item with `quantity <= 0`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created

#### Scenario: Add a freezer item
- GIVEN an ingredient `ing-peas` with `storage: "freezer", canonicalUnit: "g"` in the household
- WHEN a member submits `POST /api/inventory` with `{ ingredientId: "ing-peas", quantity: 1, unit: "kg" }`
- THEN the system fills `location: "freezer"` from the ingredient
- AND the stored quantity is `{ value: 1000, unit: "g" }`

#### Scenario: Invalid location
- GIVEN an authenticated household member
- WHEN they submit an item with `location` other than `pantry`, `fridge` or `freezer`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created

#### Scenario: Invalid expirationDate format
- GIVEN an authenticated household member
- WHEN they submit an item with `expirationDate: "not-a-date"` or any value that is not an ISO `YYYY-MM-DD`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created

### Requirement: Listing Inventory Items
The system SHALL return the list of inventory items belonging to the user's household.

The list MAY be filtered by location via query parameter `?location=pantry|fridge|freezer`. Without a filter, all items are returned, grouped or sortable by location.

Each returned item MUST include the resolved ingredient `name` and the ingredient `category` (so the client can render and group without a second request), and MUST include the item's `expirationDate` (ISO date `YYYY-MM-DD` or `null`).

#### Scenario: List all items
- GIVEN a household with 3 pantry items and 2 fridge items
- WHEN a member calls `GET /api/inventory`
- THEN the system returns all 5 items
- AND each item includes `id`, `ingredientId`, `name` (resolved from the ingredient), `category` (resolved from the ingredient), `location`, `quantity` (with canonical unit), `expirationDate` (ISO date or null), and `lastUpdate` timestamp

#### Scenario: List only pantry items
- GIVEN the same household
- WHEN a member calls `GET /api/inventory?location=pantry`
- THEN the system returns only the 3 pantry items
- AND each returned item exposes its `expirationDate` field

### Requirement: Updating an Inventory Item
The system SHALL allow a household member to update an inventory item belonging to their household.

Updatable fields: `location`, `quantity`, `unit`, `expirationDate`. The `ingredientId` is **immutable** once the item is created (changing the ingredient effectively means deleting the item and creating a new one — explicitly required so the user notices).

When updating `quantity`/`unit`, the unit MUST convert to the ingredient's `canonicalUnit`; HTTP 400 otherwise.

`expirationDate` MAY be set to `null` explicitly to clear a previously stored DLC.

#### Scenario: Update quantity
- GIVEN an existing inventory item with ingredient `ing-pasta` and quantity `500 g`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ quantity: 250, unit: "g" }`
- THEN the item's quantity is updated to `250 g`

#### Scenario: Update location (override)
- GIVEN an existing inventory item bound to an ingredient with `storage: "pantry"` and currently `location: "pantry"`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ location: "fridge" }`
- THEN the item's location is updated to `"fridge"`

#### Scenario: Update expirationDate
- GIVEN an existing inventory item with `expirationDate: "2026-06-30"`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ expirationDate: "2026-07-15" }`
- THEN the item's `expirationDate` is updated to `2026-07-15`

#### Scenario: Clear expirationDate
- GIVEN an existing inventory item with an `expirationDate` set
- WHEN a member calls `PATCH /api/inventory/:id` with `{ expirationDate: null }`
- THEN the item's `expirationDate` becomes NULL

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

## ADDED Requirements

### Requirement: Adding an Inventory Item from a Product Scan
The system SHALL expose `POST /api/inventory/from-scan` allowing a household member to create an inventory item from a previously resolved product (typically after a barcode scan).

The request body MUST include:
- `productId` (string, required) referencing a product in the same household.
- `quantity` (object with `value` and `unit`, required). The unit MUST convert to the ingredient's `canonicalUnit`.
- `expirationDate` (string `YYYY-MM-DD`, optional). When omitted, the server computes `today + ingredient.shelfLifeDays` if defined, otherwise stores `NULL`.
- `location` (`pantry | fridge | freezer`, optional). When omitted, the server fills from `ingredient.storage` (resolved via the product).

The use case MUST consult the product through a port `IProductLookup` declared in `server/contexts/inventory/domain/ports/`. The inventory use case MUST NOT import directly from `server/contexts/ingredients/**`. The adapter implementation lives under `server/contexts/ingredients/infrastructure/` and is wired in the composition root.

On success, the system returns HTTP 201 with the created item view (same shape as `POST /api/inventory`).

#### Scenario: Add by scan with all defaults
- GIVEN a product `prod-1` with `packSize: 500, packUnit: "g"` bound to ingredient `ing-pasta` (`storage: "pantry", shelfLifeDays: 730`)
- AND the current date is 2026-05-17
- WHEN a member submits `POST /api/inventory/from-scan` with `{ productId: "prod-1", quantity: { value: 500, unit: "g" } }`
- THEN a new inventory item is created in their household
- AND the item has `ingredientId: "ing-pasta"`, `location: "pantry"`, `expirationDate: "2028-05-17"`, quantity `{ value: 500, unit: "g" }`

#### Scenario: Add by scan with explicit DLC overrides default
- GIVEN the same product as above
- WHEN a member submits `{ productId: "prod-1", quantity: { value: 500, unit: "g" }, expirationDate: "2027-01-15" }`
- THEN the stored `expirationDate` is `2027-01-15` (explicit value wins over the computed default)

#### Scenario: Add by scan with explicit location override
- GIVEN a product whose ingredient has `storage: "pantry"`
- WHEN a member submits `{ productId: "...", quantity: {...}, location: "freezer" }`
- THEN the item is created with `location: "freezer"`

#### Scenario: Unknown product
- GIVEN no product with id `prod-unknown` in the household
- WHEN a member submits `POST /api/inventory/from-scan` with `{ productId: "prod-unknown", ... }`
- THEN the system returns HTTP 404 Not Found
- AND no item is created

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

### Requirement: Consuming Inventory by Barcode (FIFO on DLC)
The system SHALL expose `POST /api/inventory/consume-by-barcode` allowing a household member to decrement inventory items by scanning a barcode.

The request body MUST include:
- `barcode` (string, required). Validated and normalized via the `Barcode` VO.
- `quantity` (object with `value` and `unit`, required). The unit MUST convert to the ingredient's `canonicalUnit`.
- `lotId` (string, optional). When provided, the system decrements **only that specific lot** (must belong to the same household and the same resolved ingredient).
- `preview` (boolean, optional, default false). When true, the system computes the FIFO plan but does NOT modify any state.

Resolution order:
1. The barcode is resolved through the `IBarcodeResolver` port (already specified) to obtain a product and its ingredient.
2. All inventory items in the household with the resolved `ingredientId` are listed, sorted by `expirationDate ASC NULLS LAST, createdAt ASC` (FIFO with unknown DLCs last).
3. If `lotId` is provided, only that lot is considered.
4. The requested quantity is drained from the head of the queue. When a lot reaches zero, it is removed (consistent with `Adjust Quantity`). Overflow to the next lot is allowed.
5. If the total available quantity across all candidate lots is less than the requested quantity, the system returns HTTP 400 and modifies no state.

In `preview` mode, the response is `{ candidates: Array<{ lotId, expirationDate, currentQuantity, wouldRemove }>, totalAvailable, fullyConsumed: boolean }`. No state changes.

In normal mode, the response is `{ impactedLots: Array<{ lotId, quantityRemoved, remainingQuantity, deleted: boolean }> }`.

The use case MUST consult the existing `IBarcodeResolver` port (already wired). It MUST NOT import from `server/contexts/ingredients/**`.

#### Scenario: Consume from a single lot
- GIVEN one inventory item `inv-1` of ingredient `ing-yogurt` with quantity `4 unit` and `expirationDate: "2026-06-01"`
- AND a product with barcode `1234567890128` bound to `ing-yogurt`
- WHEN a member submits `POST /api/inventory/consume-by-barcode` with `{ barcode: "1234567890128", quantity: { value: 1, unit: "unit" } }`
- THEN `inv-1` is updated to `3 unit`
- AND the response is `{ impactedLots: [{ lotId: "inv-1", quantityRemoved: 1, remainingQuantity: 3, deleted: false }] }`

#### Scenario: FIFO order across multiple lots
- GIVEN three inventory items of the same ingredient with `expirationDate` `2026-06-01`, `2026-06-15`, `null` respectively
- WHEN listing the FIFO order
- THEN the items appear in this order: `2026-06-01`, then `2026-06-15`, then the one with `null`

#### Scenario: Overflow across two lots
- GIVEN two inventory items of `ing-yogurt`: `inv-1` (4 unit, DLC 2026-06-01), `inv-2` (4 unit, DLC 2026-06-15)
- WHEN a member submits `{ barcode: "...", quantity: { value: 5, unit: "unit" } }`
- THEN `inv-1` is fully consumed (4 unit removed) and deleted from the inventory
- AND `inv-2` is decremented by 1 (now 3 unit)
- AND the response lists both impacted lots in order

#### Scenario: Insufficient total quantity
- GIVEN two lots totalling 4 unit
- WHEN a member requests `{ quantity: { value: 5, unit: "unit" } }`
- THEN the system returns HTTP 400 Bad Request
- AND no lot is modified

#### Scenario: Preview mode does not modify state
- GIVEN two lots totalling 6 unit
- WHEN a member submits `{ ..., preview: true, quantity: { value: 5, unit: "unit" } }`
- THEN the system returns the FIFO candidate plan with `wouldRemove` per lot
- AND no inventory item is modified

#### Scenario: Explicit lotId targets a single lot
- GIVEN three lots of the same ingredient
- WHEN a member submits `{ ..., lotId: "inv-2", quantity: { value: 1, unit: "unit" } }`
- THEN only `inv-2` is considered and decremented
- AND the other two lots are unchanged

#### Scenario: Unknown barcode
- GIVEN no product with the scanned barcode in the household
- WHEN a member submits `POST /api/inventory/consume-by-barcode`
- THEN the system returns HTTP 404 Not Found
- AND no inventory item is modified

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
