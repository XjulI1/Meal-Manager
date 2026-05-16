import { ListIngredientsQuerySchema } from '../../../shared/dto/ingredient'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const query = await getValidatedQuery(event, (raw) => ListIngredientsQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ingredients query.' })
  }

  return event.context.container.listIngredients.execute({
    householdId,
    q: query.data.q,
    category: query.data.category,
    storage: query.data.storage,
    includeArchived: query.data.includeArchived,
  })
})
