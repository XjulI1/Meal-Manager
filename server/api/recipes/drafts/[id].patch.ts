import { UpdateRecipeDraftSchema } from '../../../../shared/dto/recipe-drafts'
import { RecipeDraftNotFoundError } from '../../../contexts/catalog/domain/errors/recipe-draft-not-found.error'
import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing recipe draft id.' })
  }
  const body = await readValidatedBody(event, (raw) => UpdateRecipeDraftSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recipe draft payload.' })
  }

  try {
    return await event.context.container.updateRecipeDraft.execute({
      householdId,
      id,
      content: body.data,
    })
  }
  catch (error) {
    if (error instanceof RecipeDraftNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Recipe draft not found.' })
    }
    throw error
  }
})
