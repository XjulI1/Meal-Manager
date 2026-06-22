import type { RecipeDraftContentInput } from '../../domain/entities/recipe-draft.entity'
import { RecipeDraftNotFoundError } from '../../domain/errors/recipe-draft-not-found.error'
import type { IRecipeDraftRepository } from '../../domain/ports/recipe-draft-repository.port'
import { toRecipeDraftView, type RecipeDraftView } from './recipe-draft-view'

export interface UpdateRecipeDraftInput {
  householdId: string
  id: string
  /** Partial content patch (autosave). `source` is immutable and not accepted here. */
  content: RecipeDraftContentInput
}

export class UpdateRecipeDraftUseCase {
  constructor(
    private readonly drafts: IRecipeDraftRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateRecipeDraftInput): Promise<RecipeDraftView> {
    const existing = await this.drafts.findById(input.id, input.householdId)
    if (!existing) {
      throw new RecipeDraftNotFoundError(input.id)
    }
    const updated = existing.withContent(input.content, this.clock())
    await this.drafts.update(updated)
    return toRecipeDraftView(updated)
  }
}
