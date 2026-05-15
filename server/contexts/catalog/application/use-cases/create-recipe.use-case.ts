import { randomUUID } from 'node:crypto'
import { Quantity } from '../../../../../shared/units/quantity'
import { Recipe } from '../../domain/entities/recipe.entity'
import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'
import { RecipeIngredient } from '../../domain/value-objects/recipe-ingredient.vo'

export interface RecipeIngredientInput {
  name: string
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
  ingredients: Array<{ name: string, quantity: { value: number, unit: string } }>
  updatedAt: string
}

export class CreateRecipeUseCase {
  constructor(
    private readonly recipes: IRecipeRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateRecipeInput): Promise<RecipeView> {
    const now = this.clock()
    const ingredients = input.ingredients.map((ing) =>
      RecipeIngredient.create({
        name: ing.name,
        quantity: Quantity.fromUserInput(ing.quantity.value, ing.quantity.unit),
      }),
    )
    const recipe = Recipe.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      title: input.title,
      instructions: input.instructions,
      servings: input.servings,
      ingredients,
      now,
    })
    await this.recipes.create(recipe)
    return toRecipeView(recipe)
  }
}

export function toRecipeView(recipe: Recipe): RecipeView {
  return {
    id: recipe.id,
    title: recipe.title,
    instructions: recipe.instructions,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: { value: ing.quantity.value, unit: ing.quantity.unit },
    })),
    updatedAt: recipe.updatedAt.toISOString(),
  }
}
