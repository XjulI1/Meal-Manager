import { IngredientNotFoundError } from '../../domain/errors/ingredient-not-found.error'
import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'

export interface DeleteIngredientInput {
  householdId: string
  id: string
}

export interface DeleteIngredientResult {
  /** `soft` when the ingredient is still referenced (archived), `hard` otherwise (cascaded delete). */
  mode: 'soft' | 'hard'
}

export class DeleteIngredientUseCase {
  constructor(
    private readonly ingredients: IIngredientRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: DeleteIngredientInput): Promise<DeleteIngredientResult> {
    const existing = await this.ingredients.findById(input.id, input.householdId)
    if (!existing) {
      throw new IngredientNotFoundError(input.id)
    }

    const referenced = await this.ingredients.isReferenced(input.id, input.householdId)
    if (referenced) {
      const archived = existing.archive(this.clock())
      await this.ingredients.save(archived)
      return { mode: 'soft' }
    }

    await this.ingredients.hardDelete(input.id, input.householdId)
    return { mode: 'hard' }
  }
}
