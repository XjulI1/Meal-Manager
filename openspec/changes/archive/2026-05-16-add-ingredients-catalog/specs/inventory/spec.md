# Delta for Inventory

Ce change rend `ingredient_id` **obligatoire** sur chaque article d'inventaire (le mode string libre disparaît, la colonne `name` est supprimée du schéma). Le port `IBarcodeResolver` reçoit son adapter concret. La `location` reste une propriété propre à l'article (peut différer du `storage` par défaut de l'ingrédient).

## MODIFIED Requirements

### Requirement: Adding an Inventory Item
The system SHALL allow a household member to add an item to the household inventory.

An item has:
- An `ingredientId` referencing a non-archived ingredient that belongs to the same household. The field is **required**; HTTP 400 if missing, HTTP 400 if the ingredient is from another household or archived.
- A storage location: `pantry` or `fridge`. The field is **optional** at the API level; if omitted, the system fills it from `ingredient.storage`. A submitted value MAY differ from `ingredient.storage` (legitimate override).
- A quantity (positive number) and a unit. The unit MUST convert to the ingredient's `canonicalUnit`; HTTP 400 otherwise (incompatible dimension).

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

#### Scenario: Invalid location
- GIVEN an authenticated household member
- WHEN they submit an item with `location` other than `pantry` or `fridge`
- THEN the system returns HTTP 400 Bad Request
- AND no item is created

### Requirement: Listing Inventory Items
The system SHALL return the list of inventory items belonging to the user's household.

The list MAY be filtered by location via query parameter `?location=pantry|fridge`. Without a filter, all items are returned, grouped or sortable by location.

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

#### Scenario: Update quantity
- GIVEN an existing inventory item with ingredient `ing-pasta` and quantity `500 g`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ quantity: 250, unit: "g" }`
- THEN the item's quantity is updated to `250 g`

#### Scenario: Update location (override)
- GIVEN an existing inventory item bound to an ingredient with `storage: "pantry"` and currently `location: "pantry"`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ location: "fridge" }`
- THEN the item's location is updated to `"fridge"`

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

### Requirement: Barcode Resolution Port (future-proofing)
The domain layer MUST define an `IBarcodeResolver` port in `server/contexts/inventory/domain/ports/`.

The port MUST expose a method `resolve(barcode: string): Promise<BarcodeResolution | null>` where `BarcodeResolution` contains at minimum a `name` and optionally a `defaultUnit`, an `ingredientId`, a `productId`, a `storage` value, and a `category`.

```ts
export interface BarcodeResolution {
  name: string;
  defaultUnit?: CanonicalUnit;
  ingredientId?: string;
  productId?: string;
  storage?: 'pantry' | 'fridge';
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
