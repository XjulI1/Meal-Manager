import { z } from 'zod'
import { WeekStartSchema } from '../../../shared/dto/menus'
import { requireHouseholdMember } from '../../utils/require-household'

const GetMenuQuerySchema = z.object({
  weekStart: WeekStartSchema,
})

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const query = await getValidatedQuery(event, (raw) => GetMenuQuerySchema.safeParse(raw))
  if (!query.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'weekStart must be a Monday in YYYY-MM-DD format.',
    })
  }

  return event.context.container.getMenuByWeek.execute({
    householdId,
    weekStart: query.data.weekStart,
  })
})
