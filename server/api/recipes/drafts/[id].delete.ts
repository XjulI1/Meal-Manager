import { RecipeDraftNotFoundError } from '../../../contexts/catalog/domain/errors/recipe-draft-not-found.error'
import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing recipe draft id.' })
  }

  try {
    await event.context.container.deleteRecipeDraft.execute({ householdId, id })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    if (error instanceof RecipeDraftNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Recipe draft not found.' })
    }
    throw error
  }
})
