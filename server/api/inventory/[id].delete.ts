import { ItemNotFoundError } from '../../contexts/inventory/domain/errors/item-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing item id.' })
  }

  try {
    await event.context.container.removeInventoryItem.execute({ householdId, id })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    if (error instanceof ItemNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Inventory item not found.' })
    }
    throw error
  }
})
