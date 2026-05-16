# shopping Specification

## Purpose
TBD - created by archiving change init-meal-manager. Update Purpose after archive.
## Requirements
### Requirement: Shopping List Generation from a Menu
The system SHALL generate a shopping list snapshot from a given menu.

The generation algorithm:

1. Collect every ingredient required by every assigned slot of the menu. Each recipe ingredient carries a mandatory `ingredient_id`.
2. For each slot, scale the recipe's ingredient quantities by the ratio `slot.servings / recipe.servings`.
3. Aggregate identical ingredients by `(ingredient_id, canonical_unit)`. All scaled entries sharing the same key are summed.
4. For each aggregated entry, subtract the quantity of the matching inventory item — matched by `(ingredient_id, canonical_unit)`.
5. Discard entries whose remaining quantity is zero or negative.
6. Persist the result as a `ShoppingListSnapshot` linked to the menu. For each persisted item:
   - `ingredientId` is the aggregation key (not nullable).
   - `name` is the resolved ingredient name **at generation time** (denormalized in the snapshot so a later rename of the ingredient does not retroactively change the shopping list).
   - `category` is the resolved ingredient category **at generation time** (same rationale).
   - `isChecked` is `false`.

If a `ShoppingListSnapshot` already exists for the given menu, the request MUST either:
- Return the existing snapshot if the client provides `?reuse=true`
- Otherwise, replace it with a newly generated one (the previous snapshot is deleted, including any checked state)

#### Scenario: Generate a fresh shopping list
- GIVEN a household with:
  - An ingredient `ing-pasta` (`name: "Pâtes"`, `canonicalUnit: "g"`, `category: "grocery"`)
  - An ingredient `ing-butter` (`name: "Beurre"`, `canonicalUnit: "g"`, `category: "dairy"`)
  - A menu containing one slot for `recipe-pasta` (servings = 2) at 4 servings
  - `recipe-pasta` requires `ing-pasta` × 200 g and `ing-butter` × 30 g (for 2 servings)
  - Inventory contains `100 g` of `ing-butter` and nothing else
- WHEN a member calls `POST /api/shopping-lists` with `{ menuId: "...", reuse: false }`
- THEN a new snapshot is created with:
  - One entry `Pâtes — 400 g` with `ingredientId: "ing-pasta"`, `category: "grocery"`
  - No entry for butter ((60 − 100) < 0, omitted)
- AND each item is marked as `isChecked: false`

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

#### Scenario: Snapshot survives a later rename of an ingredient
- GIVEN a snapshot generated when ingredient `ing-pasta` was named `"Pâtes"`
- WHEN the ingredient is later renamed to `"Pâtes complètes"`
- AND a member fetches the existing snapshot via `GET /api/shopping-lists?menuId=...`
- THEN the snapshot item still displays the name `"Pâtes"` (the denormalized historical value)
- AND its `ingredientId` still resolves to `ing-pasta`

### Requirement: Aggregation Rules
When aggregating ingredients across recipes, the system MUST aggregate by `(ingredient_id, canonical_unit)`.

Two scaled lines from two different recipes that both reference the same `ingredient_id` MUST be summed into a single entry. The system MUST sum quantities only if they share the same canonical unit; entries with the same `ingredient_id` but different canonical units (this should not occur given the `canonical_unit` is fixed per ingredient, but is defended against) MUST be kept as separate entries.

#### Scenario: Two recipes share an ingredient
- GIVEN two slots whose recipes both reference `ing-butter`
- AND the scaled quantities are `30 g` and `50 g`
- WHEN the shopping list is generated
- THEN the resulting snapshot contains a single entry `Beurre — 80 g` with `ingredientId: "ing-butter"`

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

### Requirement: Shopping List Sorted by Aisle
The `GET /api/shopping-lists?menuId=...` response MUST return items ordered for in-store shopping by `(category, name)`.

The category order MUST follow the fixed sequence: `produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other`. Within a category, items are sorted alphabetically by `name`.

The response payload structure for each item MUST include the `ingredientId`, `name`, `category`, `quantity` (with canonical unit), and `isChecked` fields.

#### Scenario: List returns items ordered by aisle
- GIVEN a snapshot with items in categories `dairy`, `produce`, `grocery`
- WHEN a member calls `GET /api/shopping-lists?menuId=...`
- THEN the items are ordered: `produce` items first, then `dairy`, then `grocery`
- AND each item carries `ingredientId`, `name`, `category`, `quantity`, and `isChecked`

#### Scenario: Items within a category sorted by name
- GIVEN a snapshot with three `produce` items: `Tomate`, `Carotte`, `Oignon`
- WHEN a member fetches the list
- THEN the produce items appear in alphabetical order: `Carotte`, `Oignon`, `Tomate`
