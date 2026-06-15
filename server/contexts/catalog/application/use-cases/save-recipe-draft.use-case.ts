import { randomUUID } from 'node:crypto'
import {
  RECIPE_DRAFTS_MAX_PER_HOUSEHOLD,
  RecipeDraft,
  type RecipeDraftContentInput,
  type RecipeDraftSource,
} from '../../domain/entities/recipe-draft.entity'
import { RecipeDraftLimitReachedError } from '../../domain/errors/recipe-draft-limit-reached.error'
import type { IRecipeDraftRepository } from '../../domain/ports/recipe-draft-repository.port'
import { toRecipeDraftView, type RecipeDraftView } from './recipe-draft-view'

export interface SaveRecipeDraftInput {
  householdId: string
  source: RecipeDraftSource
  content: RecipeDraftContentInput
}

/**
 * Persists a new recipe draft for a household, whatever its origin (manual,
 * AI chat/URL/photo, or MCP agent). Enforces the per-household cap before
 * creating anything.
 */
export class SaveRecipeDraftUseCase {
  constructor(
    private readonly drafts: IRecipeDraftRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: SaveRecipeDraftInput): Promise<RecipeDraftView> {
    const count = await this.drafts.countForHousehold(input.householdId)
    if (count >= RECIPE_DRAFTS_MAX_PER_HOUSEHOLD) {
      throw new RecipeDraftLimitReachedError()
    }

    const draft = RecipeDraft.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      source: input.source,
      content: input.content,
      now: this.clock(),
    })
    await this.drafts.create(draft)
    return toRecipeDraftView(draft)
  }
}
