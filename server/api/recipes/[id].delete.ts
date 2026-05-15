import { RecipeNotFoundError } from '../../contexts/catalog/domain/errors/recipe-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing recipe id.' })
  }

  try {
    await event.context.container.deleteRecipe.execute({ householdId, id })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    if (error instanceof RecipeNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Recipe not found.' })
    }
    throw error
  }
})
