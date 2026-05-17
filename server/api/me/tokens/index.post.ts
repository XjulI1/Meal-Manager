import { CreatePersonalAccessTokenSchema } from '../../../../shared/dto/personal-access-tokens'
import { UserNotInHouseholdError } from '../../../contexts/platform/domain/errors/user-not-in-household.error'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readValidatedBody(event, (raw) => CreatePersonalAccessTokenSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token payload.' })
  }

  try {
    const result = await event.context.container.createPersonalAccessToken.execute({
      userId: session.user.id,
      name: body.data.name,
    })
    setResponseStatus(event, 201)
    return {
      plaintext: result.plaintext,
      token: {
        id: result.token.id,
        name: result.token.name,
        prefix: result.token.prefix,
        createdAt: result.token.createdAt.toISOString(),
        lastUsedAt: result.token.lastUsedAt ? result.token.lastUsedAt.toISOString() : null,
        revokedAt: result.token.revokedAt ? result.token.revokedAt.toISOString() : null,
      },
    }
  }
  catch (error) {
    if (error instanceof UserNotInHouseholdError) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You must join a household before issuing a token.',
      })
    }
    throw error
  }
})
