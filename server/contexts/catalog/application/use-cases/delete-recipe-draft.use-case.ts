import { RecipeDraftNotFoundError } from '../../domain/errors/recipe-draft-not-found.error'
import type { IRecipeDraftRepository } from '../../domain/ports/recipe-draft-repository.port'

export interface DeleteRecipeDraftInput {
  householdId: string
  id: string
}

export class DeleteRecipeDraftUseCase {
  constructor(private readonly drafts: IRecipeDraftRepository) {}

  async execute(input: DeleteRecipeDraftInput): Promise<void> {
    const existing = await this.drafts.findById(input.id, input.householdId)
    if (!existing) {
      throw new RecipeDraftNotFoundError(input.id)
    }
    await this.drafts.delete(input.id, input.householdId)
  }
}
