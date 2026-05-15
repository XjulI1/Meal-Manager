import { CreateHouseholdSchema } from '../../../shared/dto/family'
import { AlreadyInHouseholdError } from '../../contexts/family/domain/errors/already-in-household.error'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readValidatedBody(event, (raw) => CreateHouseholdSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid household payload.' })
  }

  try {
    const result = await event.context.container.createHousehold.execute({
      userId: session.user.id,
      name: body.data.name,
    })
    return result
  }
  catch (error) {
    if (error instanceof AlreadyInHouseholdError) {
      throw createError({ statusCode: 409, statusMessage: 'User already belongs to a household.' })
    }
    throw error
  }
})
