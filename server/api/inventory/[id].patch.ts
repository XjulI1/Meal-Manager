import { UpdateInventoryItemSchema } from '../../../shared/dto/inventory'
import { ItemNotFoundError } from '../../contexts/inventory/domain/errors/item-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing item id.' })
  }
  const body = await readValidatedBody(event, (raw) => UpdateInventoryItemSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid inventory payload.' })
  }

  try {
    return await event.context.container.updateInventoryItem.execute({
      householdId,
      id,
      name: body.data.name,
      quantity: body.data.quantity,
      location: body.data.location,
    })
  }
  catch (error) {
    if (error instanceof ItemNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Inventory item not found.' })
    }
    throw error
  }
})
