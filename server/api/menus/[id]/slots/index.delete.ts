import { z } from 'zod'
import { DayOfWeekSchema, MealTypeSchema } from '../../../../../shared/dto/menus'
import { MenuNotFoundError } from '../../../../contexts/meal-planning/domain/errors/menu-not-found.error'
import { requireHouseholdMember } from '../../../../utils/require-household'

const ClearSlotQuerySchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  mealType: MealTypeSchema,
})

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const menuId = getRouterParam(event, 'id')
  if (!menuId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing menu id.' })
  }
  const query = await getValidatedQuery(event, (raw) => ClearSlotQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slot query.' })
  }

  try {
    await event.context.container.clearSlot.execute({
      householdId,
      menuId,
      dayOfWeek: query.data.dayOfWeek,
      mealType: query.data.mealType,
    })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    if (error instanceof MenuNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Menu not found.' })
    }
    throw error
  }
})
