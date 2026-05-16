import { TokenNotFoundError } from '../../../contexts/platform/domain/errors/token-not-found.error'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token id.' })
  }

  try {
    await event.context.container.revokePersonalAccessToken.execute({
      userId: session.user.id,
      tokenId: id,
    })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    if (error instanceof TokenNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Token not found.' })
    }
    throw error
  }
})
