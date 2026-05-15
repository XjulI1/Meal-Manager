import { CreateInventoryItemSchema } from '../../../shared/dto/inventory'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => CreateInventoryItemSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid inventory payload.' })
  }

  setResponseStatus(event, 201)
  return event.context.container.addInventoryItem.execute({
    householdId,
    name: body.data.name,
    quantity: body.data.quantity,
    location: body.data.location,
  })
})
