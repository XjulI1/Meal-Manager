# shopping Specification

## Purpose
TBD - created by archiving change init-meal-manager. Update Purpose after archive.
## Requirements
### Requirement: Shopping List Generation from a Menu
The system SHALL generate a shopping list snapshot from a given menu.

The generation algorithm:

1. Collect every ingredient required by every assigned slot of the menu.
2. For each slot, scale the recipe's ingredient quantities by the ratio `slot.servings / recipe.servings`.
3. Aggregate identical ingredients (same name, case-insensitive, same canonical unit) by summing their quantities.
4. For each aggregated entry, subtract the quantity of the matching inventory item (same name, case-insensitive, same canonical unit) if any.
5. Discard entries whose remaining quantity is zero or negative.
6. Persist the result as a `ShoppingListSnapshot` linked to the menu, with each entry marked as not checked.

If a `ShoppingListSnapshot` already exists for the given menu, the request MUST either:
- Return the existing snapshot if the client provides `?reuse=true`
- Otherwise, replace it with a newly generated one (the previous snapshot is deleted, including any checked state)

#### Scenario: Generate a fresh shopping list
- GIVEN a household with:
  - A menu containing one slot for `recipe-pasta` (servings = 2) at 4 servings
  - `recipe-pasta` requires `200 g` pasta and `30 g` butter (for 2 servings)
  - Inventory contains `100 g` of butter and nothing else
- WHEN a member calls `POST /api/shopping-lists` with `{ menuId: "...", reuse: false }`
- THEN a new snapshot is created with:
  - `400 g` of pasta (200 × 2)
  - `(60 - 100) g` of butter, which is negative, so butter is omitted entirely
- AND each remaining item is marked as `isChecked: false`
- AND the system returns the snapshot

#### Scenario: Reuse an existing list
- GIVEN a snapshot already exists for menu `menu-123` and several items are checked
- WHEN a member calls `POST /api/shopping-lists` with `{ menuId: "menu-123", reuse: true }`
- THEN the existing snapshot is returned with the checked state preserved
- AND no new generation occurs

#### Scenario: Regenerate replaces the snapshot
- GIVEN a snapshot already exists for menu `menu-123` with some items checked
- WHEN a member calls `POST /api/shopping-lists` with `{ menuId: "menu-123", reuse: false }`
- THEN the existing snapshot is deleted
- AND a new snapshot is created from scratch (no items checked)

#### Scenario: Menu from another household
- GIVEN a menu belonging to household A
- WHEN a member of household B attempts to generate a shopping list from it
- THEN the system returns HTTP 404 Not Found

#### Scenario: Empty menu
- GIVEN a menu with no assigned slots
- WHEN a member generates a shopping list from it
- THEN the system returns a snapshot with an empty items list
- AND HTTP 200 OK

### Requirement: Aggregation Rules
When aggregating ingredients across recipes, the system MUST:

- Compare ingredient names using **trimmed, lower-cased** strings to determine identity (e.g. `"Lait"`, `" lait "`, `"LAIT"` are the same ingredient)
- Sum quantities only if they share the same canonical unit; ingredients with the same name but different canonical dimensions MUST be kept as separate entries (this is unusual but possible if user data is inconsistent)

#### Scenario: Two recipes share an ingredient
- GIVEN two slots whose recipes both list "Beurre"
- AND the scaled quantities are `30 g` and `50 g`
- WHEN the shopping list is generated
- THEN the resulting snapshot contains a single entry `Beurre — 80 g`

### Requirement: Retrieving the Current Shopping List
The system SHALL allow a household member to fetch the current shopping list snapshot for a given menu.

#### Scenario: Fetch current list
- GIVEN a snapshot exists for menu `menu-123`
- WHEN a member calls `GET /api/shopping-lists?menuId=menu-123`
- THEN the system returns the snapshot with all items and their `isChecked` state

#### Scenario: No list yet
- GIVEN no snapshot exists for menu `menu-123`
- WHEN a member calls `GET /api/shopping-lists?menuId=menu-123`
- THEN the system returns HTTP 404 Not Found

### Requirement: Toggling a Shopping List Item
The system SHALL allow a household member to toggle the `isChecked` state of an item in a shopping list snapshot.

The change is persisted so that other members of the household see the same checked state.

#### Scenario: Check an item
- GIVEN a shopping list snapshot with an item `pasta — 400 g` (`isChecked: false`)
- WHEN a member calls `PATCH /api/shopping-lists/:snapshotId/items/:itemId` with `{ isChecked: true }`
- THEN the item's `isChecked` is set to `true`
- AND a subsequent `GET` returns it as checked

#### Scenario: Uncheck an item
- GIVEN an item with `isChecked: true`
- WHEN a member toggles it to `false`
- THEN the item's `isChecked` is set to `false`

### Requirement: Shopping List Is Not the Source of Truth
The shopping list snapshot is a **derived artifact**. The system MUST be able to regenerate it from the menu and inventory at any time.

Specifically, the snapshot MUST NOT be the place where one edits ingredient quantities manually. To change what appears on a shopping list, the user MUST edit the underlying menu, recipe, or inventory and regenerate.

This requirement is informational and captured here so future changes do not introduce "manual edit" features without explicit reconsideration.

#### Scenario: Manual edit attempt
- GIVEN a shopping list snapshot
- WHEN a client attempts to call an endpoint to modify quantities of an item directly (other than checked state)
- THEN no such endpoint exists in v1
- AND if added in the future, this requirement MUST be revisited

