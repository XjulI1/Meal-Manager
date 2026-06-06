import { ImportRecipeSchema } from '../../../shared/dto/recipe-chat'
import { RecipeImportError } from '../../contexts/catalog/domain/errors/recipe-import.error'
import { requireAiEnabled } from '../../utils/require-ai-enabled'

/**
 * Imports a recipe from a pasted URL into a draft (never persisted). Scoped to
 * the household and gated by AI access. A failed/unreachable import → 400.
 */
export default defineEventHandler(async (event) => {
  const { householdId } = await requireAiEnabled(event)

  const body = await readValidatedBody(event, (raw) => ImportRecipeSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid import payload.' })
  }

  try {
    return await event.context.container.importRecipeFromUrl.execute({
      householdId,
      url: body.data.url,
    })
  }
  catch (error) {
    if (error instanceof RecipeImportError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
