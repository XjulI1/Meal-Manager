import { Quantity } from '../../../../../shared/units/quantity'
import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error'
import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'
import { RecipeIngredient } from '../../domain/value-objects/recipe-ingredient.vo'
import { toRecipeView, type RecipeIngredientInput, type RecipeView } from './create-recipe.use-case'

export interface UpdateRecipeInput {
  householdId: string
  id: string
  title?: string
  instructions?: string
  servings?: number
  ingredients?: ReadonlyArray<RecipeIngredientInput>
}

export class UpdateRecipeUseCase {
  constructor(
    private readonly recipes: IRecipeRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateRecipeInput): Promise<RecipeView> {
    const existing = await this.recipes.findById(input.id, input.householdId)
    if (!existing) {
      throw new RecipeNotFoundError(input.id)
    }

    const now = this.clock()
    let updated = existing
    if (input.title !== undefined) updated = updated.withTitle(input.title, now)
    if (input.instructions !== undefined) updated = updated.withInstructions(input.instructions, now)
    if (input.servings !== undefined) updated = updated.withServings(input.servings, now)
    if (input.ingredients !== undefined) {
      const mapped = input.ingredients.map((ing) =>
        RecipeIngredient.create({
          name: ing.name,
          quantity: Quantity.fromUserInput(ing.quantity.value, ing.quantity.unit),
        }),
      )
      updated = updated.withIngredients(mapped, now)
    }

    await this.recipes.update(updated)
    return toRecipeView(updated)
  }
}
