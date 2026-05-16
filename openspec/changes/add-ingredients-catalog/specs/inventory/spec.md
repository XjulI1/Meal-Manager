# Delta for Inventory

Ce change évolue le port `IBarcodeResolver` (le port reste défini dans `inventory/domain/`, mais un adapter concret est désormais branché par la composition root) et autorise un `inventory_item` à référencer optionnellement un `ingredient_id` issu du contexte `ingredients`.

## ADDED Requirements

### Requirement: Optional Ingredient Reference on Inventory Items
The system SHALL allow an inventory item to optionally reference an `ingredient_id` pointing to an entry in the `ingredients` catalog of the same household.

When provided:
- The `ingredient_id` MUST belong to the same household; otherwise HTTP 400.
- The `ingredient_id` MUST point to a non-archived ingredient; HTTP 400 otherwise.
- The submitted `location` (pantry/fridge) MAY be omitted: if absent, the system fills it from `ingredient.storage`.
- The submitted `unit` MUST convert to the ingredient's `canonicalUnit`; otherwise HTTP 400 (incompatible dimension).
- The inventory item's `name` MAY be omitted: if absent, the system fills it from `ingredient.name`.

When omitted, the inventory item continues to operate in **string-only mode** (legacy v1 behaviour). Both modes coexist within the same household.

#### Scenario: Add an inventory item by ingredient id
- GIVEN an authenticated household member
- AND an ingredient `ing-1` with `name: "Pâtes", storage: "pantry", canonicalUnit: "g", defaultPackSize: 500` in the user's household
- WHEN they submit `POST /api/inventory` with `{ ingredientId: "ing-1", quantity: 500, unit: "g" }`
- THEN a new inventory item is created with `name: "Pâtes", location: "pantry", quantity: { value: 500, unit: "g" }, ingredientId: "ing-1"`

#### Scenario: Add by ingredient id with explicit unit conversion
- GIVEN an ingredient `ing-1` with `canonicalUnit: "g"`
- WHEN a member submits `{ ingredientId: "ing-1", quantity: 1, unit: "kg" }`
- THEN the stored quantity is `{ value: 1000, unit: "g" }`

#### Scenario: Incompatible unit dimension
- GIVEN an ingredient `ing-1` with `canonicalUnit: "g"`
- WHEN a member submits `{ ingredientId: "ing-1", quantity: 500, unit: "ml" }`
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

## MODIFIED Requirements

### Requirement: Barcode Resolution Port (future-proofing)
The domain layer MUST define an `IBarcodeResolver` port in `server/contexts/inventory/domain/ports/`.

The port MUST expose a method `resolve(barcode: string): Promise<BarcodeResolution | null>` where `BarcodeResolution` contains at minimum a `name` and optionally a `defaultUnit`, an `ingredientId`, a `productId`, and a `storage` value.

```ts
export interface BarcodeResolution {
  name: string;
  defaultUnit?: CanonicalUnit;
  ingredientId?: string;
  productId?: string;
  storage?: 'pantry' | 'fridge';
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
