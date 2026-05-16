# Delta for Shopping

Ce change étend l'algorithme d'agrégation pour fusionner d'abord sur `ingredient_id` quand il est présent, et ajoute un champ `category` à chaque entrée de la liste de courses pour permettre un tri par rayon. Les entrées sans `ingredient_id` continuent d'être agrégées par nom (mode mixte).

## MODIFIED Requirements

### Requirement: Shopping List Generation from a Menu
The system SHALL generate a shopping list snapshot from a given menu.

The generation algorithm:

1. Collect every ingredient required by every assigned slot of the menu.
2. For each slot, scale the recipe's ingredient quantities by the ratio `slot.servings / recipe.servings`.
3. Aggregate identical ingredients by:
   - **Primary key when present:** `(ingredient_id, canonical_unit)`. All entries sharing the same `ingredient_id` are summed.
   - **Fallback for legacy entries (no `ingredient_id`):** `(name.trim().toLowerCase(), canonical_unit)`. Legacy entries are NEVER merged with bound entries even if their name matches — this would silently change behaviour for users who haven't migrated.
4. For each aggregated entry, subtract the matching inventory quantity:
   - If the aggregated entry has an `ingredient_id`, match inventory items by `ingredient_id` AND canonical unit.
   - Otherwise, match inventory items by `(name.trim().toLowerCase(), canonical_unit)` AND only inventory items that themselves have no `ingredient_id`.
5. Discard entries whose remaining quantity is zero or negative.
6. Persist the result as a `ShoppingListSnapshot` linked to the menu. For each persisted item:
   - Store the `ingredient_id` if the aggregation used one (nullable in DB).
   - Store the `name` (resolved from the ingredient when bound, or from the original string).
   - Store a `category` derived from the ingredient when bound; for legacy unbound entries, `category` defaults to `other`.
   - Mark `isChecked` as `false`.

If a `ShoppingListSnapshot` already exists for the given menu, the request MUST either:
- Return the existing snapshot if the client provides `?reuse=true`
- Otherwise, replace it with a newly generated one (the previous snapshot is deleted, including any checked state)

#### Scenario: Generate a fresh shopping list (legacy string mode)
- GIVEN a household with:
  - A menu containing one slot for `recipe-pasta` (servings = 2) at 4 servings
  - `recipe-pasta` requires `200 g` pasta and `30 g` butter (for 2 servings), both as legacy string entries (no `ingredient_id`)
  - Inventory contains `100 g` of "butter" (also legacy) and nothing else
- WHEN a member calls `POST /api/shopping-lists` with `{ menuId: "...", reuse: false }`
- THEN a new snapshot is created with:
  - `400 g` of pasta (200 × 2)
  - `(60 - 100) g` of butter, which is negative, so butter is omitted entirely
- AND each remaining item is marked as `isChecked: false`
- AND each item has `ingredientId: null` and `category: "other"`

#### Scenario: Generate using ingredient ids
- GIVEN a household with:
  - An ingredient `ing-pasta` (`name: "Pâtes"`, `canonicalUnit: "g"`, `category: "grocery"`)
  - An ingredient `ing-butter` (`name: "Beurre"`, `canonicalUnit: "g"`, `category: "dairy"`)
  - A menu with one slot for `recipe-pasta` (servings = 2) at 4 servings
  - `recipe-pasta` requires `ing-pasta` × 200 g and `ing-butter` × 30 g, both bound
  - Inventory contains `100 g` of `ing-butter` (bound) and nothing else
- WHEN a member generates the shopping list
- THEN the snapshot contains a single entry: `Pâtes — 400 g`, with `ingredientId: "ing-pasta"` and `category: "grocery"`
- AND butter is omitted (60 − 100 < 0)

#### Scenario: Bound and unbound do not merge
- GIVEN a recipe with two ingredients sharing the name "Beurre":
  - One bound to ingredient `ing-butter` with scaled quantity `30 g`
  - One legacy string entry `"Beurre"` with scaled quantity `20 g`
- WHEN the shopping list is generated
- THEN the snapshot contains TWO separate entries:
  - `Beurre — 30 g` with `ingredientId: "ing-butter"`, `category: "dairy"`
  - `Beurre — 20 g` with `ingredientId: null`, `category: "other"`

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

- Aggregate first by `ingredient_id` when present. Two scaled lines from two different recipes that both reference `ing-butter` MUST be summed into a single entry.
- For lines without `ingredient_id`, fall back to comparing names using **trimmed, lower-cased** strings (e.g. `"Lait"`, `" lait "`, `"LAIT"` collapse).
- NEVER merge a bound entry (with `ingredient_id`) with an unbound entry (without `ingredient_id`), even if their names match — preserving user intent.
- Sum quantities only if they share the same canonical unit; entries with the same key but different canonical dimensions MUST be kept as separate entries.

#### Scenario: Two recipes share a bound ingredient
- GIVEN two slots whose recipes both reference `ing-butter`
- AND the scaled quantities are `30 g` and `50 g`
- WHEN the shopping list is generated
- THEN the resulting snapshot contains a single entry `Beurre — 80 g` with `ingredientId: "ing-butter"`

#### Scenario: Two recipes share an unbound ingredient name
- GIVEN two slots whose recipes both list `"Beurre"` as a legacy string entry
- AND the scaled quantities are `30 g` and `50 g`
- WHEN the shopping list is generated
- THEN the resulting snapshot contains a single entry `Beurre — 80 g` with `ingredientId: null`

## ADDED Requirements

### Requirement: Shopping List Sorted by Aisle
The `GET /api/shopping-lists?menuId=...` response MUST return items grouped/sortable by `category` (aisle).

The response payload structure for each item MUST include the `category` field (one of the closed set defined by `ingredients` capability, plus `other` for legacy or unresolved entries). Items SHOULD be ordered by `(category, name)` so a client rendering the list naturally groups by aisle.

The category order in the response MUST follow a fixed, store-friendly sequence: `produce, bakery, meat-fish, dairy, frozen, grocery, beverages, household, other`.

#### Scenario: List returns items ordered by aisle
- GIVEN a snapshot with items in categories `dairy`, `produce`, `grocery`
- WHEN a member calls `GET /api/shopping-lists?menuId=...`
- THEN the items are ordered: `produce` items first, then `dairy`, then `grocery`
- AND each item carries a `category` field

#### Scenario: Legacy entries land in `other`
- GIVEN a snapshot generated entirely from legacy string entries
- WHEN a member fetches the list
- THEN every item has `category: "other"`
- AND they appear last in the ordering
