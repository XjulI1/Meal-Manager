import { ImportRecipePhotosSchema } from '../../../shared/dto/recipe-chat'
import { RecipePhotoImportError } from '../../contexts/catalog/domain/errors/recipe-photo-import.error'
import { requireAiEnabled } from '../../utils/require-ai-enabled'

/**
 * Imports a recipe from one or more photos into a draft (never persisted).
 * Scoped to the household and gated by AI access. Images are validated at the
 * boundary (count, media type, size) — an invalid payload → 400 with no
 * Anthropic call. A failed extraction → 400.
 */
export default defineEventHandler(async (event) => {
  const { householdId } = await requireAiEnabled(event)

  const body = await readValidatedBody(event, (raw) => ImportRecipePhotosSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid photo import payload.' })
  }

  try {
    return await event.context.container.importRecipeFromPhotos.execute({
      householdId,
      images: body.data.images,
    })
  }
  catch (error) {
    if (error instanceof RecipePhotoImportError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
