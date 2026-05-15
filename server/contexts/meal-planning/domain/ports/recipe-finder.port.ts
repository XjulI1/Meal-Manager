/**
 * Narrow port the meal-planning context uses to verify that a recipe id
 * belongs to a given household. Implemented in infrastructure as a thin
 * adapter over the catalog context (without exposing the rest of its API).
 */
export interface IRecipeFinder {
  existsInHousehold(recipeId: string, householdId: string): Promise<boolean>
}
