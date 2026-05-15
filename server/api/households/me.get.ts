import { NotInHouseholdError } from '../../contexts/family/domain/errors/not-in-household.error'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  try {
    return await event.context.container.getCurrentHousehold.execute({ userId: session.user.id })
  }
  catch (error) {
    if (error instanceof NotInHouseholdError) {
      throw createError({ statusCode: 404, statusMessage: 'No household.' })
    }
    throw error
  }
})
