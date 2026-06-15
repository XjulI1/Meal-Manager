import { RECIPE_DRAFTS_MAX_PER_HOUSEHOLD } from '../entities/recipe-draft.entity'

export class RecipeDraftLimitReachedError extends Error {
  override readonly name = 'RecipeDraftLimitReachedError'
  constructor(limit: number = RECIPE_DRAFTS_MAX_PER_HOUSEHOLD) {
    super(`Recipe draft limit reached for this household (max ${limit}).`)
  }
}
