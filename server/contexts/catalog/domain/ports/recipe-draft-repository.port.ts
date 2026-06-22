import type { RecipeDraft, RecipeDraftSource } from '../entities/recipe-draft.entity'

export interface RecipeDraftSummary {
  id: string
  title: string | null
  source: RecipeDraftSource
  updatedAt: Date
}

export interface IRecipeDraftRepository {
  /** Returns the draft (with ingredients) if it belongs to the household, otherwise null. */
  findById(id: string, householdId: string): Promise<RecipeDraft | null>

  /** Lightweight summaries ordered by most recently updated first. */
  listForHousehold(householdId: string): Promise<RecipeDraftSummary[]>

  /** Number of active drafts owned by the household (for the per-household cap). */
  countForHousehold(householdId: string): Promise<number>

  /** Insert a new draft and its ingredients atomically. */
  create(draft: RecipeDraft): Promise<void>

  /** Update an existing draft (replacing its ingredients) atomically. */
  update(draft: RecipeDraft): Promise<void>

  /** Delete a draft belonging to the household (cascades to draft ingredients). */
  delete(id: string, householdId: string): Promise<void>
}
