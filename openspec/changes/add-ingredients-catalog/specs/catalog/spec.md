# Delta for Catalog

Ce change permet à un `recipe_ingredient` de référencer optionnellement un `ingredient_id` issu du contexte `ingredients`. Les recettes existantes (string libre) restent valides.

## ADDED Requirements

### Requirement: Optional Ingredient Reference on Recipe Ingredients
The system SHALL allow a recipe ingredient to optionally reference an `ingredient_id` pointing to an entry in the `ingredients` catalog of the same household.

When provided:
- The `ingredient_id` MUST belong to the same household; otherwise HTTP 400.
- The `ingredient_id` MUST point to a non-archived ingredient; otherwise HTTP 400.
- The submitted `unit` MUST convert to the ingredient's `canonicalUnit`; otherwise HTTP 400 (incompatible dimension).
- The recipe ingredient's `name` MAY be omitted: if absent, the system fills it from `ingredient.name`.

When omitted, the recipe ingredient continues to operate in **string-only mode** (legacy v1 behaviour). Both modes coexist within a single recipe.

The choice of mode is **per recipe ingredient**, not per recipe — a recipe may freely mix bound and unbound ingredients (typical migration path).

#### Scenario: Create a recipe with one bound and one unbound ingredient
- GIVEN an authenticated household member
- AND an ingredient `ing-pasta` with `name: "Pâtes", canonicalUnit: "g"` in the household
- WHEN they submit `POST /api/recipes` with:
  ```
  {
    "title": "Pâtes au beurre",
    "servings": 2,
    "instructions": "...",
    "ingredients": [
      { "ingredientId": "ing-pasta", "quantity": 200, "unit": "g" },
      { "name": "Beurre", "quantity": 30, "unit": "g" }
    ]
  }
  ```
- THEN the recipe is created with both ingredients
- AND the first ingredient has `ingredientId: "ing-pasta"` and `name: "Pâtes"` (filled from the catalog)
- AND the second ingredient has `ingredientId: null` and `name: "Beurre"`

#### Scenario: Bound ingredient with incompatible unit
- GIVEN an ingredient `ing-pasta` with `canonicalUnit: "g"`
- WHEN a recipe ingredient submits `{ ingredientId: "ing-pasta", quantity: 200, unit: "ml" }`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Bound ingredient from another household
- GIVEN an ingredient belonging to household A
- WHEN a member of household B creates a recipe referencing that `ingredientId`
- THEN the system returns HTTP 400 Bad Request

#### Scenario: Retrieving a recipe exposes the ingredient reference
- GIVEN a recipe whose ingredients include a bound entry
- WHEN a member calls `GET /api/recipes/:id`
- THEN each ingredient in the response carries an `ingredientId: string | null` field
