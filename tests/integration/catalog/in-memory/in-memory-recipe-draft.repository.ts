import type { RecipeDraft } from '../../../../server/contexts/catalog/domain/entities/recipe-draft.entity'
import type {
  IRecipeDraftRepository,
  RecipeDraftSummary,
} from '../../../../server/contexts/catalog/domain/ports/recipe-draft-repository.port'

export class InMemoryRecipeDraftRepository implements IRecipeDraftRepository {
  private readonly drafts = new Map<string, RecipeDraft>()

  async findById(id: string, householdId: string): Promise<RecipeDraft | null> {
    const draft = this.drafts.get(id)
    if (!draft || draft.householdId !== householdId) return null
    return draft
  }

  async listForHousehold(householdId: string): Promise<RecipeDraftSummary[]> {
    const out: RecipeDraftSummary[] = []
    for (const draft of this.drafts.values()) {
      if (draft.householdId !== householdId) continue
      out.push({
        id: draft.id,
        title: draft.title ?? null,
        source: draft.source,
        updatedAt: draft.updatedAt,
      })
    }
    return out.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async countForHousehold(householdId: string): Promise<number> {
    let count = 0
    for (const draft of this.drafts.values()) {
      if (draft.householdId === householdId) count++
    }
    return count
  }

  async create(draft: RecipeDraft): Promise<void> {
    if (this.drafts.has(draft.id)) {
      throw new Error(`Recipe draft already exists: ${draft.id}`)
    }
    this.drafts.set(draft.id, draft)
  }

  async update(draft: RecipeDraft): Promise<void> {
    if (!this.drafts.has(draft.id)) {
      throw new Error(`Cannot update unknown recipe draft: ${draft.id}`)
    }
    this.drafts.set(draft.id, draft)
  }

  async delete(id: string, householdId: string): Promise<void> {
    const existing = this.drafts.get(id)
    if (existing && existing.householdId === householdId) {
      this.drafts.delete(id)
    }
  }
}
