import { GenerateShoppingListSchema } from '../../../shared/dto/shopping'
import { MenuNotAvailableError } from '../../contexts/shopping/domain/errors/menu-not-available.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => GenerateShoppingListSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid shopping-list payload.' })
  }

  try {
    return await event.context.container.generateShoppingList.execute({
      householdId,
      menuId: body.data.menuId,
      reuse: body.data.reuse,
    })
  }
  catch (error) {
    if (error instanceof MenuNotAvailableError) {
      throw createError({ statusCode: 404, statusMessage: 'Menu not found.' })
    }
    throw error
  }
})
