import { RecipeDraftNotFoundError } from '../../domain/errors/recipe-draft-not-found.error'
import type { IRecipeDraftRepository } from '../../domain/ports/recipe-draft-repository.port'
import { toRecipeDraftView, type RecipeDraftView } from './recipe-draft-view'

export interface GetRecipeDraftByIdInput {
  householdId: string
  id: string
}

export class GetRecipeDraftByIdUseCase {
  constructor(private readonly drafts: IRecipeDraftRepository) {}

  async execute(input: GetRecipeDraftByIdInput): Promise<RecipeDraftView> {
    const draft = await this.drafts.findById(input.id, input.householdId)
    if (!draft) {
      throw new RecipeDraftNotFoundError(input.id)
    }
    return toRecipeDraftView(draft)
  }
}
