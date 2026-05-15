import { z } from 'zod'
import { ShoppingListNotFoundError } from '../../contexts/shopping/domain/errors/shopping-list-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

const GetShoppingListQuerySchema = z.object({
  menuId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const query = await getValidatedQuery(event, (raw) => GetShoppingListQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'menuId query parameter is required.' })
  }

  try {
    return await event.context.container.getShoppingListByMenu.execute({
      householdId,
      menuId: query.data.menuId,
    })
  }
  catch (error) {
    if (error instanceof ShoppingListNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'No shopping list for this menu yet.' })
    }
    throw error
  }
})
