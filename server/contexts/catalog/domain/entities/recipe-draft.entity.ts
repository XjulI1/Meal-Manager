import type { RecipeIngredientDraft } from '../ports/recipe-importer'

/**
 * Persisted recipe draft: a deliberately permissive, work-in-progress recipe
 * scoped to a household. Unlike {@link Recipe}, every content field is optional
 * and ingredients are kept as FREE TEXT (not yet resolved against the catalog).
 * Drafts are promoted to recipes through the existing resolve + create flow.
 *
 * NB: this is the persisted aggregate. The ephemeral structured content emitted
 * by the AI assistant / importers is `RecipeDraftContent` (see recipe-importer).
 */

export const RECIPE_DRAFT_SOURCES = ['manual', 'ai-chat', 'ai-url', 'ai-photo', 'mcp'] as const
export type RecipeDraftSource = (typeof RECIPE_DRAFT_SOURCES)[number]

export const RECIPE_DRAFT_TITLE_MAX_LENGTH = 200
export const RECIPE_DRAFT_INSTRUCTIONS_MAX_LENGTH = 10_000
export const RECIPE_DRAFT_SERVINGS_MIN = 1
export const RECIPE_DRAFT_SERVINGS_MAX = 50
export const RECIPE_DRAFT_INGREDIENTS_MAX = 100
/** Hard cap on active drafts per household (bounds growth, notably via MCP agents). */
export const RECIPE_DRAFTS_MAX_PER_HOUSEHOLD = 50

/** Mutable content of a draft. All fields optional; `source`/`id` live on the entity. */
export interface RecipeDraftContentInput {
  title?: string
  instructions?: string
  servings?: number
  ingredients?: ReadonlyArray<RecipeIngredientDraft>
  sourceUrl?: string
}

export interface RecipeDraftProps {
  id: string
  householdId: string
  source: RecipeDraftSource
  title?: string
  instructions?: string
  servings?: number
  ingredients: ReadonlyArray<RecipeIngredientDraft>
  sourceUrl?: string
  createdAt: Date
  updatedAt: Date
}

export class RecipeDraft {
  readonly id: string
  readonly householdId: string
  readonly source: RecipeDraftSource
  readonly title?: string
  readonly instructions?: string
  readonly servings?: number
  readonly ingredients: ReadonlyArray<RecipeIngredientDraft>
  readonly sourceUrl?: string
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: RecipeDraftProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.source = props.source
    this.title = props.title
    this.instructions = props.instructions
    this.servings = props.servings
    this.ingredients = props.ingredients
    this.sourceUrl = props.sourceUrl
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: {
    id: string
    householdId: string
    source: RecipeDraftSource
    content?: RecipeDraftContentInput
    now?: Date
  }): RecipeDraft {
    const now = props.now ?? new Date()
    const content = RecipeDraft.assertContent(props.content ?? {})
    return new RecipeDraft({
      id: props.id,
      householdId: props.householdId,
      source: RecipeDraft.assertSource(props.source),
      ...content,
      ingredients: content.ingredients ?? [],
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: RecipeDraftProps): RecipeDraft {
    return new RecipeDraft(props)
  }

  /** Apply a partial content patch (autosave). `source` is immutable and never patched. */
  withContent(patch: RecipeDraftContentInput, now: Date = new Date()): RecipeDraft {
    const next = RecipeDraft.assertContent(patch)
    return new RecipeDraft({
      id: this.id,
      householdId: this.householdId,
      source: this.source,
      title: 'title' in patch ? next.title : this.title,
      instructions: 'instructions' in patch ? next.instructions : this.instructions,
      servings: 'servings' in patch ? next.servings : this.servings,
      ingredients: 'ingredients' in patch ? (next.ingredients ?? []) : this.ingredients,
      sourceUrl: 'sourceUrl' in patch ? next.sourceUrl : this.sourceUrl,
      createdAt: this.createdAt,
      updatedAt: now,
    })
  }

  private static assertSource(source: RecipeDraftSource): RecipeDraftSource {
    if (!RECIPE_DRAFT_SOURCES.includes(source)) {
      throw new Error(`Invalid recipe draft source: ${source}.`)
    }
    return source
  }

  /** Normalize + validate a content patch; empty title/instructions collapse to undefined. */
  private static assertContent(content: RecipeDraftContentInput): RecipeDraftContentInput {
    const out: RecipeDraftContentInput = {}

    if ('title' in content) {
      const title = content.title?.trim() ?? ''
      if (title.length > RECIPE_DRAFT_TITLE_MAX_LENGTH) {
        throw new Error(`Recipe draft title must not exceed ${RECIPE_DRAFT_TITLE_MAX_LENGTH} characters.`)
      }
      out.title = title.length > 0 ? title : undefined
    }

    if ('instructions' in content) {
      const instructions = content.instructions ?? ''
      if (instructions.length > RECIPE_DRAFT_INSTRUCTIONS_MAX_LENGTH) {
        throw new Error(`Recipe draft instructions must not exceed ${RECIPE_DRAFT_INSTRUCTIONS_MAX_LENGTH} characters.`)
      }
      out.instructions = instructions.length > 0 ? instructions : undefined
    }

    if ('servings' in content && content.servings !== undefined) {
      const servings = content.servings
      if (!Number.isInteger(servings) || servings < RECIPE_DRAFT_SERVINGS_MIN || servings > RECIPE_DRAFT_SERVINGS_MAX) {
        throw new Error(`Recipe draft servings must be an integer between ${RECIPE_DRAFT_SERVINGS_MIN} and ${RECIPE_DRAFT_SERVINGS_MAX} (got ${servings}).`)
      }
      out.servings = servings
    }
    else if ('servings' in content) {
      out.servings = undefined
    }

    if ('ingredients' in content && content.ingredients) {
      if (content.ingredients.length > RECIPE_DRAFT_INGREDIENTS_MAX) {
        throw new Error(`Recipe draft must not exceed ${RECIPE_DRAFT_INGREDIENTS_MAX} ingredients.`)
      }
      out.ingredients = content.ingredients.map((ing) => ({
        name: ing.name.trim(),
        ...(ing.quantity ? { quantity: ing.quantity } : {}),
        ...(ing.raw !== undefined ? { raw: ing.raw } : {}),
      }))
    }

    if ('sourceUrl' in content) {
      const sourceUrl = content.sourceUrl?.trim() ?? ''
      out.sourceUrl = sourceUrl.length > 0 ? sourceUrl : undefined
    }

    return out
  }
}
