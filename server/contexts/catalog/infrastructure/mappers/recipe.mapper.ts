import { Quantity } from '../../../../../shared/units/quantity'
import type {
  NewRecipeIngredientRow,
  NewRecipeRow,
  RecipeIngredientRow,
  RecipeRow,
} from '../../../../database/schema/recipes'
import { Recipe } from '../../domain/entities/recipe.entity'
import { RecipeIngredient } from '../../domain/value-objects/recipe-ingredient.vo'

export const RecipeMapper = {
  toDomain(row: RecipeRow, ingredientRows: ReadonlyArray<RecipeIngredientRow>): Recipe {
    const ingredients = [...ingredientRows]
      .sort((a, b) => a.position - b.position)
      .map((r) => RecipeIngredient.rehydrate({
        name: r.name,
        quantity: Quantity.fromCanonical(r.quantityValue, r.quantityUnit),
      }))

    return Recipe.rehydrate({
      id: row.id,
      householdId: row.householdId,
      title: row.title,
      instructions: row.instructions,
      servings: row.servings,
      ingredients,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(recipe: Recipe): NewRecipeRow {
    return {
      id: recipe.id,
      householdId: recipe.householdId,
      title: recipe.title,
      instructions: recipe.instructions,
      servings: recipe.servings,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    }
  },

  ingredientsToPersistence(recipe: Recipe): NewRecipeIngredientRow[] {
    return recipe.ingredients.map((ing, position) => ({
      recipeId: recipe.id,
      position,
      name: ing.name,
      quantityValue: ing.quantity.value,
      quantityUnit: ing.quantity.unit,
    }))
  },
}
