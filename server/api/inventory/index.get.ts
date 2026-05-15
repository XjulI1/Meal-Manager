import { ListInventoryQuerySchema } from '../../../shared/dto/inventory'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const query = await getValidatedQuery(event, (raw) => ListInventoryQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid inventory query.' })
  }

  return event.context.container.listInventoryItems.execute({
    householdId,
    location: query.data.location,
  })
})
