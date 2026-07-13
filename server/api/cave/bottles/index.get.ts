import { ListBottlesQuerySchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const query = await getValidatedQuery(event, (raw) => ListBottlesQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Filtre de bouteilles invalide.' })
  }

  return event.context.container.listBottles.execute({ householdId, ...query.data })
})
