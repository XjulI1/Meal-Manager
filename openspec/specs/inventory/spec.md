# inventory Specification

## Purpose
TBD - created by archiving change init-meal-manager. Update Purpose after archive.
## Requirements
### Requirement: Adding an Inventory Item
The system SHALL allow a household member to add an item to the household inventory.

An item has:
- A non-empty name (1–100 characters)
- A storage location: `pantry` or `fridge`
- A quantity (positive number) and a unit (any unit that converts to a canonical unit `g`, `ml`, or `unit`)

The quantity MUST be normalized to canonical units before persistence (see `platform/spec.md` — Quantity Normalization).

#### Scenario: Add a pantry item
- GIVEN an authenticated household member
- WHEN they submit `POST /api/inventory` with `{ name: "Pâtes", location: "pantry", quantity: 500, unit: "g" }`
- THEN a new inventory item is created in their household
- AND the item is associated with `location: "pantry"`
- AND the stored quantity is `{ value: 500, unit: "g" }`

#### Scenario: Add a fridge item with unit conversion
- GIVEN an authenticated household member
- WHEN they submit `POST /api/inventory` with `{ name: "Lait", location: "fridge", quantity: 1, unit: "L" }`
- THEN the stored quantity is `{ value: 1000, unit: "ml" }`

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

The list MAY be filtered by location via query parameter `?location=pantry|fridge`.
Without a filter, all items are returned, grouped or sortable by location.

#### Scenario: List all items
- GIVEN a household with 3 pantry items and 2 fridge items
- WHEN a member calls `GET /api/inventory`
- THEN the system returns all 5 items
- AND each item includes id, name, location, quantity (with canonical unit), and last-update timestamp

#### Scenario: List only pantry items
- GIVEN the same household
- WHEN a member calls `GET /api/inventory?location=pantry`
- THEN the system returns only the 3 pantry items

### Requirement: Updating an Inventory Item
The system SHALL allow a household member to update an inventory item belonging to their household.

Updatable fields: name, location, quantity, unit.

#### Scenario: Update quantity
- GIVEN an existing inventory item `{ name: "Pâtes", quantity: 500g }`
- WHEN a member calls `PATCH /api/inventory/:id` with `{ quantity: 250, unit: "g" }`
- THEN the item's quantity is updated to `250 g`

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
The domain layer MUST define an `IBarcodeResolver` port (interface only, no implementation in v1).

The port MUST expose a method `resolve(barcode: string): Promise<BarcodeResolution | null>` where `BarcodeResolution` contains at least a name and optionally a default unit.

This requirement exists to ensure that adding barcode scanning later does not require domain changes.

#### Scenario: Port presence
- GIVEN the v1 codebase
- WHEN the inventory domain is inspected
- THEN the file `server/contexts/inventory/domain/ports/barcode-resolver.ts` exists
- AND it exports an interface or type with the expected shape
- AND no concrete implementation is registered in the composition root

