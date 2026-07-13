## MODIFIED Requirements

### Requirement: Shopping List Generation from a Menu
The system SHALL generate a shopping list snapshot from a given menu.

The generation algorithm:

1. Collect every ingredient required by every assigned slot of the menu. Two sources contribute:
   - **Recipe items**: each recipe ingredient carries a mandatory `ingredient_id`.
   - **Free-ingredient items**: each carries a mandatory `ingredient_id` and a `quantity` in the ingredient's canonical unit.
2. For each recipe item, scale the recipe's ingredient quantities by the ratio `slot.servings / recipe.servings`. Free-ingredient items are taken at their stored quantity (no scaling).
3. Aggregate identical ingredients by `(ingredient_id, canonical_unit)`. All entries sharing the same key — whether they come from recipes or free ingredients — are summed.
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
- **GIVEN** a household with:
  - An ingredient `ing-pasta` (`name: "Pâtes"`, `canonicalUnit: "g"`, `category: "grocery"`)
  - An ingredient `ing-butter` (`name: "Beurre"`, `canonicalUnit: "g"`, `category: "dairy"`)
  - A menu containing one slot for `recipe-pasta` (servings = 2) at 4 servings
  - `recipe-pasta` requires `ing-pasta` × 200 g and `ing-butter` × 30 g (for 2 servings)
  - Inventory contains `100 g` of `ing-butter` and nothing else
- **WHEN** a member calls `POST /api/shopping-lists` with `{ menuId: "...", reuse: false }`
- **THEN** a new snapshot is created with:
  - One entry `Pâtes — 400 g` with `ingredientId: "ing-pasta"`, `category: "grocery"`
  - No entry for butter ((60 − 100) < 0, omitted)
- **AND** each item is marked as `isChecked: false`

#### Scenario: Free ingredients contribute to the list
- **GIVEN** a catalog ingredient `ing-bread` (`name: "Pain"`, `canonicalUnit: "g"`)
- **AND** a menu slot holding a free-ingredient item `ing-bread` × `300 g` and no inventory for it
- **WHEN** a member generates the shopping list
- **THEN** the snapshot contains an entry `Pain — 300 g` with `ingredientId: "ing-bread"`

#### Scenario: A recipe ingredient and a free ingredient are summed
- **GIVEN** a slot whose recipe scales to `ing-butter` × `30 g`
- **AND** the same slot (or another) holds a free-ingredient item `ing-butter` × `50 g`
- **AND** no inventory for `ing-butter`
- **WHEN** the shopping list is generated
- **THEN** the snapshot contains a single entry `Beurre — 80 g` with `ingredientId: "ing-butter"`

#### Scenario: Reuse an existing list
- **GIVEN** a snapshot already exists for menu `menu-123` and several items are checked
- **WHEN** a member calls `POST /api/shopping-lists` with `{ menuId: "menu-123", reuse: true }`
- **THEN** the existing snapshot is returned with the checked state preserved
- **AND** no new generation occurs

#### Scenario: Regenerate replaces the snapshot
- **GIVEN** a snapshot already exists for menu `menu-123` with some items checked
- **WHEN** a member calls `POST /api/shopping-lists` with `{ menuId: "menu-123", reuse: false }`
- **THEN** the existing snapshot is deleted
- **AND** a new snapshot is created from scratch (no items checked)

#### Scenario: Menu from another household
- **GIVEN** a menu belonging to household A
- **WHEN** a member of household B attempts to generate a shopping list from it
- **THEN** the system returns HTTP 404 Not Found

#### Scenario: Empty menu
- **GIVEN** a menu with no assigned slots
- **WHEN** a member generates a shopping list from it
- **THEN** the system returns a snapshot with an empty items list
- **AND** HTTP 200 OK

#### Scenario: Snapshot survives a later rename of an ingredient
- **GIVEN** a snapshot generated when ingredient `ing-pasta` was named `"Pâtes"`
- **WHEN** the ingredient is later renamed to `"Pâtes complètes"`
- **AND** a member fetches the existing snapshot via `GET /api/shopping-lists?menuId=...`
- **THEN** the snapshot item still displays the name `"Pâtes"` (the denormalized historical value)
- **AND** its `ingredientId` still resolves to `ing-pasta`

### Requirement: Aggregation Rules
When aggregating ingredients across a menu, the system MUST aggregate by `(ingredient_id, canonical_unit)`.

Scaled lines from recipes and quantities from free-ingredient items that reference the same `ingredient_id` MUST be summed into a single entry. The system MUST sum quantities only if they share the same canonical unit; entries with the same `ingredient_id` but different canonical units (this should not occur given the `canonical_unit` is fixed per ingredient, but is defended against) MUST be kept as separate entries.

#### Scenario: Two recipes share an ingredient
- **GIVEN** two slots whose recipes both reference `ing-butter`
- **AND** the scaled quantities are `30 g` and `50 g`
- **WHEN** the shopping list is generated
- **THEN** the resulting snapshot contains a single entry `Beurre — 80 g` with `ingredientId: "ing-butter"`

#### Scenario: A recipe and a free ingredient share an ingredient
- **GIVEN** one slot whose recipe scales to `ing-butter` × `30 g`
- **AND** a free-ingredient item `ing-butter` × `50 g`
- **WHEN** the shopping list is generated
- **THEN** the resulting snapshot contains a single entry `Beurre — 80 g` with `ingredientId: "ing-butter"`
