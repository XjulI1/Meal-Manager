import { AddSlotItemSchema } from '../../../../../../shared/dto/menus'
import { InvalidIngredientReferenceError } from '../../../../../contexts/meal-planning/domain/errors/invalid-ingredient-reference.error'
import { MenuNotFoundError } from '../../../../../contexts/meal-planning/domain/errors/menu-not-found.error'
import { RecipeNotInHouseholdError } from '../../../../../contexts/meal-planning/domain/errors/recipe-not-in-household.error'
import { requireHouseholdMember } from '../../../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const menuId = getRouterParam(event, 'id')
  if (!menuId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing menu id.' })
  }
  const body = await readValidatedBody(event, (raw) => AddSlotItemSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slot item payload.' })
  }

  try {
    setResponseStatus(event, 201)
    return await event.context.container.addSlotItem.execute({
      householdId,
      menuId,
      ...body.data,
    })
  }
  catch (error) {
    if (error instanceof MenuNotFoundError || error instanceof RecipeNotInHouseholdError) {
      throw createError({ statusCode: 404, statusMessage: 'Menu or recipe not found.' })
    }
    if (error instanceof InvalidIngredientReferenceError) {
      if (error.reason === 'not-found') {
        throw createError({ statusCode: 404, statusMessage: 'Ingredient not found.' })
      }
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
