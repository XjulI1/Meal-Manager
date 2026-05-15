import { z } from 'zod'
import { requireHouseholdMember } from '../../utils/require-household'

const ListRecipesQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const query = await getValidatedQuery(event, (raw) => ListRecipesQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recipes query.' })
  }

  return event.context.container.listRecipes.execute({
    householdId,
    query: query.data.q,
  })
})
