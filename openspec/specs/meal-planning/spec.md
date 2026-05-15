# meal-planning Specification

## Purpose
TBD - created by archiving change init-meal-manager. Update Purpose after archive.
## Requirements
### Requirement: Weekly Menu Identity
A menu MUST be uniquely identified by its household and the start date of the week (the Monday).

The system MUST identify the start of a week as the Monday of that ISO week (week starts on Monday in `fr-FR` locale).

#### Scenario: Week boundary
- GIVEN a date `2026-05-20` (a Wednesday)
- WHEN the system computes the corresponding week start
- THEN the result is `2026-05-18` (the previous Monday)

### Requirement: Creating or Retrieving a Weekly Menu
The system SHALL allow a household member to fetch (creating it lazily if needed) the menu for a given week.

If no menu exists for the requested week, the system MUST create an empty menu (one row in `menus`) and return it. This avoids forcing the client to handle a 404 + create flow.

#### Scenario: Get an existing menu
- GIVEN a household has a menu for the week starting `2026-05-18`
- WHEN a member calls `GET /api/menus?weekStart=2026-05-18`
- THEN the system returns the existing menu with all assigned slots

#### Scenario: Lazy creation
- GIVEN a household has no menu for the week starting `2026-05-25`
- WHEN a member calls `GET /api/menus?weekStart=2026-05-25`
- THEN the system creates an empty menu for that week
- AND returns it with no slots assigned

#### Scenario: Invalid weekStart
- GIVEN a request with `weekStart=2026-05-19` (Tuesday)
- WHEN the request reaches the server
- THEN the system returns HTTP 400 Bad Request
- AND the response indicates that `weekStart` MUST be a Monday in `YYYY-MM-DD` format

### Requirement: Menu Slot Structure
A menu MUST support up to 21 slots: 7 days × 3 meal types (`breakfast`, `lunch`, `dinner`).

Each slot MUST be identified by `(menuId, dayOfWeek, mealType)` and contains:
- A reference to a recipe (`recipeId`) OR is empty
- A `servings` value (positive integer) — number of portions to prepare, which MAY differ from the recipe's default `servings`

A slot MUST exist only when a recipe is assigned to it. Empty slots MUST NOT be persisted.

#### Scenario: Slot uniqueness per (day, meal)
- GIVEN a menu for the week of `2026-05-18`
- WHEN a member assigns a recipe to Monday dinner
- AND attempts to create a second slot for the same Monday dinner
- THEN the menu contains exactly one slot for `(menuId, "monday", "dinner")`
- AND empty (day, meal) combinations have no row in the slots table

### Requirement: Assigning a Recipe to a Slot
The system SHALL allow a household member to assign a recipe to a specific (day, meal type) slot of a menu.

If a slot is already assigned for the same (day, meal type), the new assignment MUST replace the previous one.

The recipe MUST belong to the same household as the menu.

#### Scenario: Assign a recipe to an empty slot
- GIVEN an empty menu for the week of `2026-05-18`
- AND a recipe `recipe-123` in the same household
- WHEN a member calls `POST /api/menus/:menuId/slots` with `{ dayOfWeek: "monday", mealType: "dinner", recipeId: "recipe-123", servings: 4 }`
- THEN a new slot is created
- AND fetching the menu returns it with that single slot

#### Scenario: Replace an existing slot
- GIVEN a slot already assigned to `recipe-A` for Monday dinner
- WHEN a member assigns `recipe-B` to the same slot
- THEN the slot now references `recipe-B`
- AND `recipe-A` is no longer in that slot

#### Scenario: Assign a recipe from another household
- GIVEN a menu in household A
- AND a recipe in household B
- WHEN a member of household A attempts to assign that recipe
- THEN the system returns HTTP 404 Not Found

#### Scenario: Invalid mealType or dayOfWeek
- GIVEN a request with `mealType: "snack"` (not in the allowed set) or `dayOfWeek: "funday"`
- WHEN the request reaches the server
- THEN the system returns HTTP 400 Bad Request

### Requirement: Clearing a Slot
The system SHALL allow a household member to clear a slot (remove the recipe assignment).

#### Scenario: Clear an assigned slot
- GIVEN a menu with a slot assigned to `recipe-A` for Monday dinner
- WHEN a member calls `DELETE /api/menus/:menuId/slots?dayOfWeek=monday&mealType=dinner`
- THEN the slot is removed
- AND the system returns HTTP 204 No Content

### Requirement: Cascade on Recipe Deletion
When a recipe is deleted from the catalog, all menu slots referencing that recipe MUST be cleared (the slots are removed; the menu itself remains).

This requirement is specified jointly with `catalog/spec.md`.

#### Scenario: Recipe deletion clears its slots
- GIVEN a menu with two slots both referencing `recipe-123`
- WHEN `recipe-123` is deleted
- THEN both slots are removed from the menu
- AND fetching the menu returns it with no slots referencing `recipe-123`

### Requirement: Menu Suggester Port (future-proofing)
The domain layer MUST define an `IMenuSuggester` port (interface only, no implementation in v1).

The port MUST expose a method `suggestForWeek(weekStart: Date, context: SuggestionContext): Promise<SuggestedMenu>` intended to be implemented later by an AI-backed adapter that takes available recipes and current inventory into account.

#### Scenario: Port presence
- GIVEN the v1 codebase
- WHEN the meal-planning domain is inspected
- THEN the file `server/contexts/meal-planning/domain/ports/menu-suggester.ts` exists
- AND no concrete implementation is registered in the composition root

