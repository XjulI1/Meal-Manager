import type { RecipeDraftSource } from '../../domain/entities/recipe-draft.entity'
import type { IRecipeDraftRepository } from '../../domain/ports/recipe-draft-repository.port'

export interface ListRecipeDraftsInput {
  householdId: string
}

export interface RecipeDraftSummaryView {
  id: string
  title: string | null
  source: RecipeDraftSource
  updatedAt: string
}

export class ListRecipeDraftsUseCase {
  constructor(private readonly drafts: IRecipeDraftRepository) {}

  async execute(input: ListRecipeDraftsInput): Promise<RecipeDraftSummaryView[]> {
    const summaries = await this.drafts.listForHousehold(input.householdId)
    return summaries.map((s) => ({
      id: s.id,
      title: s.title,
      source: s.source,
      updatedAt: s.updatedAt.toISOString(),
    }))
  }
}
