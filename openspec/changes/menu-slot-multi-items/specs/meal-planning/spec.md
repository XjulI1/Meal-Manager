## MODIFIED Requirements

### Requirement: Menu Slot Structure
A menu MUST support up to 21 slots: 7 days × 3 meal types (`breakfast`, `lunch`, `dinner`).

Each slot MUST be identified by `(menuId, dayOfWeek, mealType)` and is a **container of items**. A slot MUST hold:
- **At most one** recipe item (a reference to a recipe via `recipeId` with a `servings` value — a positive integer that MAY differ from the recipe's default `servings`), AND
- **Zero or more** free-ingredient items. Each free-ingredient item MUST reference an existing catalog ingredient (`ingredientId`) of the same household and carry a `quantity` (a `Quantity` value object stored in the ingredient's canonical unit).

A slot MUST be considered empty when it holds no items. Empty slots MUST NOT be persisted (no row in `menu_slots` and no rows in `menu_slot_items`). A slot row MUST exist only while it holds at least one item.

#### Scenario: Slot uniqueness per (day, meal)
- **GIVEN** a menu for the week of `2026-05-18`
- **WHEN** a member adds items to Monday dinner
- **THEN** the menu contains exactly one slot for `(menuId, "monday", "dinner")`
- **AND** empty (day, meal) combinations have no slot persisted

#### Scenario: A slot mixes a recipe and free ingredients
- **GIVEN** an empty slot for Monday dinner
- **WHEN** a member adds the recipe `recipe-chicken` at 4 servings
- **AND** adds the free ingredient `ing-bread` × `300 g`
- **AND** adds the free ingredient `ing-salad` × `1 unit`
- **THEN** the slot holds one recipe item and two free-ingredient items
- **AND** fetching the menu returns all three items for that slot

#### Scenario: At most one recipe per slot
- **GIVEN** a slot already holding the recipe `recipe-A`
- **WHEN** a member adds the recipe `recipe-B` to the same slot
- **THEN** the recipe item is replaced so the slot references `recipe-B`
- **AND** the slot still holds exactly one recipe item

### Requirement: Assigning a Recipe to a Slot
The system SHALL allow a household member to add (or replace) the recipe item of a specific (day, meal type) slot of a menu.

A slot MUST hold at most one recipe. If a recipe is already present for the same (day, meal type), the new assignment MUST replace the previous recipe item, leaving any free-ingredient items of that slot untouched.

The recipe MUST belong to the same household as the menu.

#### Scenario: Assign a recipe to an empty slot
- **GIVEN** an empty menu for the week of `2026-05-18`
- **AND** a recipe `recipe-123` in the same household
- **WHEN** a member calls `POST /api/menus/:menuId/slots/items` with `{ dayOfWeek: "monday", mealType: "dinner", kind: "recipe", recipeId: "recipe-123", servings: 4 }`
- **THEN** the slot for Monday dinner now holds a recipe item referencing `recipe-123`
- **AND** fetching the menu returns it with that item

#### Scenario: Replace the recipe of a slot, keeping free ingredients
- **GIVEN** a slot holding recipe `recipe-A` and a free ingredient `ing-bread` × `300 g`
- **WHEN** a member assigns recipe `recipe-B` to the same slot
- **THEN** the slot holds recipe `recipe-B` and still holds `ing-bread` × `300 g`
- **AND** `recipe-A` is no longer in that slot

#### Scenario: Assign a recipe from another household
- **GIVEN** a menu in household A
- **AND** a recipe in household B
- **WHEN** a member of household A attempts to assign that recipe
- **THEN** the system returns HTTP 404 Not Found

#### Scenario: Invalid mealType or dayOfWeek
- **GIVEN** a request with `mealType: "snack"` (not in the allowed set) or `dayOfWeek: "funday"`
- **WHEN** the request reaches the server
- **THEN** the system returns HTTP 400 Bad Request

### Requirement: Clearing a Slot
The system SHALL allow a household member to clear an entire slot (remove all of its items at once).

When the last item of a slot is removed (whether via clearing the slot or removing items individually), the slot MUST cease to exist (no persisted row).

#### Scenario: Clear an assigned slot
- **GIVEN** a menu with a slot for Monday dinner holding a recipe and one free ingredient
- **WHEN** a member calls `DELETE /api/menus/:menuId/slots?dayOfWeek=monday&mealType=dinner`
- **THEN** all items of that slot are removed and the slot no longer exists
- **AND** the system returns HTTP 204 No Content

### Requirement: Cascade on Recipe Deletion
When a recipe is deleted from the catalog, the recipe item of every menu slot referencing that recipe MUST be removed. Free-ingredient items of those slots MUST be preserved.

If removing the recipe item leaves a slot with no items, the slot MUST cease to exist; otherwise the slot remains with its remaining free-ingredient items.

This requirement is specified jointly with `catalog/spec.md`.

#### Scenario: Recipe deletion removes only its recipe items
- **GIVEN** a slot holding recipe `recipe-123` and a free ingredient `ing-bread` × `300 g`
- **AND** another slot holding only recipe `recipe-123`
- **WHEN** `recipe-123` is deleted
- **THEN** the first slot keeps `ing-bread` × `300 g` and no longer references `recipe-123`
- **AND** the second slot no longer exists (it had no remaining items)

## ADDED Requirements

### Requirement: Adding a Free Ingredient to a Slot
The system SHALL allow a household member to add a free ingredient (an ingredient without a recipe) to a specific (day, meal type) slot of a menu.

A free-ingredient item MUST reference an existing catalog ingredient of the same household via `ingredientId` and carry a `quantity` provided as a user value + unit, converted to the ingredient's canonical unit via `Quantity.fromUserInput(...)`. The unit MUST be compatible with the ingredient's canonical dimension; otherwise the system MUST reject the request.

If the slot already holds a free-ingredient item for the same `ingredientId` and canonical unit, the system MUST sum the quantities into a single item rather than create a duplicate.

A slot MAY hold free-ingredient items with or without a recipe item present.

#### Scenario: Add a free ingredient to an empty slot
- **GIVEN** an empty menu and a catalog ingredient `ing-bread` (`canonicalUnit: "g"`) in the same household
- **WHEN** a member calls `POST /api/menus/:menuId/slots/items` with `{ dayOfWeek: "monday", mealType: "dinner", kind: "ingredient", ingredientId: "ing-bread", quantity: { value: 300, unit: "g" } }`
- **THEN** the slot for Monday dinner holds one free-ingredient item `ing-bread` × `300 g`
- **AND** fetching the menu returns it

#### Scenario: Adding the same ingredient twice sums quantities
- **GIVEN** a slot holding `ing-bread` × `300 g`
- **WHEN** a member adds `ing-bread` × `200 g` to the same slot
- **THEN** the slot holds a single free-ingredient item `ing-bread` × `500 g`

#### Scenario: Free ingredient from another household
- **GIVEN** a menu in household A and an ingredient in household B
- **WHEN** a member of household A attempts to add that ingredient
- **THEN** the system returns HTTP 404 Not Found

#### Scenario: Incompatible unit
- **GIVEN** a catalog ingredient `ing-bread` whose canonical unit is `g` (mass)
- **WHEN** a member adds it with `quantity: { value: 1, unit: "L" }` (volume)
- **THEN** the system returns HTTP 400 Bad Request indicating incompatible units

### Requirement: Removing an Item from a Slot
The system SHALL allow a household member to remove a single item (the recipe item or a specific free-ingredient item) from a slot without clearing the whole slot.

Removing the recipe item MUST leave free-ingredient items untouched, and removing a free-ingredient item MUST leave the recipe item and other ingredients untouched. When the removal leaves the slot empty, the slot MUST cease to exist.

#### Scenario: Remove a free ingredient, keep the recipe
- **GIVEN** a slot holding recipe `recipe-A` and free ingredient `ing-bread` × `300 g`
- **WHEN** a member removes the `ing-bread` item
- **THEN** the slot still holds recipe `recipe-A` and no longer holds `ing-bread`

#### Scenario: Removing the last item deletes the slot
- **GIVEN** a slot holding only free ingredient `ing-bread` × `300 g`
- **WHEN** a member removes the `ing-bread` item
- **THEN** the slot no longer exists
