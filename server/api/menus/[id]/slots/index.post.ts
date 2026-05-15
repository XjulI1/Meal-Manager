import { AssignRecipeToSlotSchema } from '../../../../../shared/dto/menus'
import { MenuNotFoundError } from '../../../../contexts/meal-planning/domain/errors/menu-not-found.error'
import { RecipeNotInHouseholdError } from '../../../../contexts/meal-planning/domain/errors/recipe-not-in-household.error'
import { requireHouseholdMember } from '../../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const menuId = getRouterParam(event, 'id')
  if (!menuId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing menu id.' })
  }
  const body = await readValidatedBody(event, (raw) => AssignRecipeToSlotSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slot payload.' })
  }

  try {
    return await event.context.container.assignRecipeToSlot.execute({
      householdId,
      menuId,
      dayOfWeek: body.data.dayOfWeek,
      mealType: body.data.mealType,
      recipeId: body.data.recipeId,
      servings: body.data.servings,
    })
  }
  catch (error) {
    if (error instanceof MenuNotFoundError || error instanceof RecipeNotInHouseholdError) {
      throw createError({ statusCode: 404, statusMessage: 'Menu or recipe not found.' })
    }
    throw error
  }
})
