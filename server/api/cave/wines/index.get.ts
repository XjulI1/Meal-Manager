import { ListWinesQuerySchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const query = await getValidatedQuery(event, (raw) => ListWinesQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Filtre de vins invalide.' })
  }

  return event.context.container.listWines.execute({ householdId, ...query.data })
})
