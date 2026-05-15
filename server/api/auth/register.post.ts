import { RegisterUserSchema } from '../../../shared/dto/auth'
import { EmailAlreadyRegisteredError } from '../../contexts/platform/domain/errors/email-already-registered.error'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (raw) => RegisterUserSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid registration payload.' })
  }

  try {
    const result = await event.context.container.registerUser.execute(body.data)
    await setUserSession(event, {
      user: { id: result.userId, email: result.email },
    })
    return { user: { id: result.userId, email: result.email } }
  }
  catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      // Generic message to limit account enumeration; the status code differentiates for tests.
      throw createError({ statusCode: 409, statusMessage: 'Registration failed.' })
    }
    throw error
  }
})
