import { ResolveDraftRequestSchema } from '../../../../shared/dto/recipe-chat'
import { requireAiEnabled } from '../../../utils/require-ai-enabled'

/**
 * Resolves a recipe draft's ingredient names against the household catalog,
 * returning matched ingredients and proposed-new ingredients for the user to
 * confirm before pre-filling the recipe form. Scoped + AI-gated.
 */
export default defineEventHandler(async (event) => {
  const { householdId } = await requireAiEnabled(event)

  const body = await readValidatedBody(event, (raw) => ResolveDraftRequestSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid draft payload.' })
  }

  return await event.context.container.resolveRecipeDraft.execute({
    householdId,
    draft: body.data.draft,
  })
})
