import { JoinHouseholdSchema } from '../../../shared/dto/family'
import { AlreadyInHouseholdError } from '../../contexts/family/domain/errors/already-in-household.error'
import { HouseholdNotFoundError } from '../../contexts/family/domain/errors/household-not-found.error'
import { InvalidInviteCodeError } from '../../contexts/family/domain/value-objects/invite-code.vo'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readValidatedBody(event, (raw) => JoinHouseholdSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid join payload.' })
  }

  try {
    const result = await event.context.container.joinHousehold.execute({
      userId: session.user.id,
      inviteCode: body.data.inviteCode,
    })
    return result
  }
  catch (error) {
    if (error instanceof AlreadyInHouseholdError) {
      throw createError({ statusCode: 409, statusMessage: 'User already belongs to a household.' })
    }
    if (error instanceof HouseholdNotFoundError || error instanceof InvalidInviteCodeError) {
      throw createError({ statusCode: 404, statusMessage: 'Invite code not found.' })
    }
    throw error
  }
})
