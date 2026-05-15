import { ToggleShoppingListItemSchema } from '../../../../../shared/dto/shopping'
import {
  ShoppingListItemNotFoundError,
  ShoppingListNotFoundError,
} from '../../../../contexts/shopping/domain/errors/shopping-list-not-found.error'
import { requireHouseholdMember } from '../../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const snapshotId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  if (!snapshotId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing shopping list or item id.' })
  }
  const body = await readValidatedBody(event, (raw) => ToggleShoppingListItemSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid toggle payload.' })
  }

  try {
    return await event.context.container.toggleShoppingListItem.execute({
      householdId,
      snapshotId,
      itemId,
      isChecked: body.data.isChecked,
    })
  }
  catch (error) {
    if (error instanceof ShoppingListNotFoundError || error instanceof ShoppingListItemNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Shopping list or item not found.' })
    }
    throw error
  }
})
