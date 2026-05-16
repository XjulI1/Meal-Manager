import { randomUUID } from 'node:crypto'
import { Quantity } from '../../../../../shared/units/quantity'
import { Recipe } from '../../domain/entities/recipe.entity'
import { InvalidIngredientReferenceError } from '../../domain/errors/invalid-ingredient-reference.error'
import type { IIngredientLookup, IngredientSummary } from '../../domain/ports/ingredient-lookup.port'
import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'
import { RecipeIngredient } from '../../domain/value-objects/recipe-ingredient.vo'

export interface RecipeIngredientInput {
  ingredientId: string
  quantity: { value: number, unit: string }
}

export interface CreateRecipeInput {
  householdId: string
  title: string
  instructions: string
  servings: number
  ingredients: ReadonlyArray<RecipeIngredientInput>
}

export interface RecipeView {
  id: string
  title: string
  instructions: string
  servings: number
  ingredients: Array<{ ingredientId: string, name: string, quantity: { value: number, unit: string } }>
  updatedAt: string
}

export class CreateRecipeUseCase {
  constructor(
    private readonly recipes: IRecipeRepository,
    private readonly ingredientLookup: IIngredientLookup,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateRecipeInput): Promise<RecipeView> {
    const ingredientIds = input.ingredients.map((i) => i.ingredientId)
    const summaries = await this.ingredientLookup.findByIds(ingredientIds, input.householdId)

    const ingredients: RecipeIngredient[] = input.ingredients.map((ing) => {
      const summary = summaries.get(ing.ingredientId)
      if (!summary) {
        throw new InvalidIngredientReferenceError(ing.ingredientId, 'not-found')
      }
      if (summary.archived) {
        throw new InvalidIngredientReferenceError(ing.ingredientId, 'archived')
      }
      const quantity = Quantity.fromUserInput(ing.quantity.value, ing.quantity.unit)
      if (quantity.unit !== summary.canonicalUnit) {
        throw new InvalidIngredientReferenceError(ing.ingredientId, 'unit-incompatible')
      }
      return RecipeIngredient.create({ ingredientId: ing.ingredientId, quantity })
    })

    const recipe = Recipe.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      title: input.title,
      instructions: input.instructions,
      servings: input.servings,
      ingredients,
      now: this.clock(),
    })
    await this.recipes.create(recipe)
    return toRecipeView(recipe, summaries)
  }
}

export function toRecipeView(recipe: Recipe, summaries: Map<string, IngredientSummary>): RecipeView {
  return {
    id: recipe.id,
    title: recipe.title,
    instructions: recipe.instructions,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((ing) => ({
      ingredientId: ing.ingredientId,
      name: summaries.get(ing.ingredientId)?.name ?? 'Unknown ingredient',
      quantity: { value: ing.quantity.value, unit: ing.quantity.unit },
    })),
    updatedAt: recipe.updatedAt.toISOString(),
  }
}
