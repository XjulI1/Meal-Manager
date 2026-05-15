# Delta for Catalog

Bounded context gérant le **catalogue de recettes** favorites du foyer.

## ADDED Requirements

### Requirement: Creating a Recipe
The system SHALL allow a household member to create a recipe.

A recipe has:
- A non-empty title (1–200 characters)
- Free-form instructions (text, max 10000 characters)
- A positive integer `servings` value (number of portions the recipe produces)
- A list of one or more ingredients, each having:
  - A non-empty name (1–100 characters)
  - A quantity (positive number) and a unit (convertible to a canonical unit)

Quantities of ingredients MUST be normalized to canonical units (g, ml, unit) before persistence.

A recipe belongs to a household. It is not shared between households in v1.

#### Scenario: Create a recipe with two ingredients
- GIVEN an authenticated household member
- WHEN they submit `POST /api/recipes` with:
  ```
  {
    "title": "Pâtes au beurre",
    "servings": 2,
    "instructions": "Faire bouillir, ajouter le beurre.",
    "ingredients": [
      { "name": "Pâtes", "quantity": 200, "unit": "g" },
      { "name": "Beurre", "quantity": 30, "unit": "g" }
    ]
  }
  ```
- THEN a new recipe is created in their household
- AND both ingredients are stored with canonical units

#### Scenario: Recipe without ingredients
- GIVEN an authenticated household member
- WHEN they submit a recipe with an empty ingredients list
- THEN the system returns HTTP 400 Bad Request
- AND no recipe is created

#### Scenario: Recipe with zero servings
- GIVEN an authenticated household member
- WHEN they submit a recipe with `servings: 0` or a non-integer servings value
- THEN the system returns HTTP 400 Bad Request

### Requirement: Listing Recipes
The system SHALL return the list of recipes belonging to the user's household.

The list MAY support a text search via `?q=<term>` matching the title (case-insensitive substring).

#### Scenario: List recipes
- GIVEN a household with 3 recipes
- WHEN a member calls `GET /api/recipes`
- THEN the system returns all 3 recipes, each with id, title, and servings (ingredients MAY be omitted to keep the payload small; a dedicated endpoint returns full details)

#### Scenario: Search recipes
- GIVEN a household with recipes "Pâtes au beurre" and "Salade de tomates"
- WHEN a member calls `GET /api/recipes?q=pâtes`
- THEN only "Pâtes au beurre" is returned

### Requirement: Retrieving a Recipe
The system SHALL return the full details of a recipe (including all ingredients) given its id.

#### Scenario: Get recipe by id
- GIVEN a recipe with id `recipe-123` in the user's household
- WHEN a member calls `GET /api/recipes/recipe-123`
- THEN the system returns the recipe with title, servings, instructions, and full ingredients list

#### Scenario: Recipe from another household
- GIVEN a recipe belonging to household A
- WHEN a member of household B calls `GET /api/recipes/:id` for that recipe
- THEN the system returns HTTP 404 Not Found

### Requirement: Updating a Recipe
The system SHALL allow a household member to update a recipe belonging to their household.

The update operation MUST replace the entire ingredients list atomically (i.e. removing then re-adding all ingredients in a single transaction; partial updates of individual ingredients are not exposed at the API level in v1).

#### Scenario: Update title only
- GIVEN a recipe in the user's household
- WHEN a member calls `PATCH /api/recipes/:id` with `{ title: "New title" }`
- THEN only the title is updated
- AND ingredients and instructions remain unchanged

#### Scenario: Replace ingredients
- GIVEN a recipe with 3 ingredients
- WHEN a member calls `PATCH /api/recipes/:id` with a new `ingredients` array of 2 entries
- THEN the recipe ends up with exactly 2 ingredients (the previous 3 are removed and the new 2 are inserted)

### Requirement: Deleting a Recipe
The system SHALL allow a household member to delete a recipe belonging to their household.

If the recipe is referenced by one or more menu slots, the deletion MUST also remove those menu slots (cascade), so that the menu remains consistent.

#### Scenario: Delete an unused recipe
- GIVEN a recipe with id `recipe-123` not referenced by any menu slot
- WHEN a member calls `DELETE /api/recipes/recipe-123`
- THEN the recipe is deleted
- AND the system returns HTTP 204 No Content

#### Scenario: Delete a recipe used in a menu
- GIVEN a recipe with id `recipe-123` referenced by two menu slots
- WHEN a member calls `DELETE /api/recipes/recipe-123`
- THEN the recipe is deleted
- AND the two menu slots are also deleted (left empty)
- AND the system returns HTTP 204 No Content

### Requirement: Recipe Importer Port (future-proofing)
The domain layer MUST define an `IRecipeImporter` port (interface only, no implementation in v1).

The port MUST expose a method `importFromUrl(url: string): Promise<RecipeDraft>` returning a draft that can be reviewed by a user before persistence.

#### Scenario: Port presence
- GIVEN the v1 codebase
- WHEN the catalog domain is inspected
- THEN the file `server/contexts/catalog/domain/ports/recipe-importer.ts` exists
- AND no concrete implementation is registered in the composition root

### Requirement: Recipe Generator Port (future-proofing)
The domain layer MUST define an `IRecipeGenerator` port (interface only, no implementation in v1).

The port MUST expose a method `generateFromAvailableIngredients(inventory: InventoryItem[]): Promise<RecipeDraft[]>` intended to be implemented later by an AI-backed adapter.

#### Scenario: Port presence
- GIVEN the v1 codebase
- WHEN the catalog domain is inspected
- THEN the file `server/contexts/catalog/domain/ports/recipe-generator.ts` exists
- AND no concrete implementation is registered in the composition root
