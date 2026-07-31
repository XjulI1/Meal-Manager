import { MenuNotFoundError } from '../../../../../contexts/meal-planning/domain/errors/menu-not-found.error'
import { SlotItemNotFoundError } from '../../../../../contexts/meal-planning/domain/errors/slot-item-not-found.error'
import { requireHouseholdMember } from '../../../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const menuId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  if (!menuId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing menu id or item id.' })
  }

  try {
    await event.context.container.removeSlotItem.execute({ householdId, menuId, itemId })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    if (error instanceof MenuNotFoundError || error instanceof SlotItemNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Menu or slot item not found.' })
    }
    throw error
  }
})
