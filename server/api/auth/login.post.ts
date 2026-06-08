import { LoginUserSchema } from '../../../shared/dto/auth'
import { InvalidCredentialsError } from '../../contexts/platform/domain/errors/invalid-credentials.error'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (raw) => LoginUserSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid login payload.' })
  }

  try {
    const result = await event.context.container.loginUser.execute(body.data)
    const user = { id: result.userId, email: result.email, aiEnabled: result.aiEnabled }
    await setUserSession(event, { user })
    return { user }
  }
  catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
    }
    throw error
  }
})
