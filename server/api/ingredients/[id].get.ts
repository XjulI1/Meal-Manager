import { IngredientNotFoundError } from '../../contexts/ingredients/domain/errors/ingredient-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ingredient id.' })
  }

  try {
    return await event.context.container.getIngredient.execute({ householdId, id })
  }
  catch (error) {
    if (error instanceof IngredientNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Ingredient not found.' })
    }
    throw error
  }
})
