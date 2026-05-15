import { beforeEach, describe, expect, it, vi } from 'vitest'
import registerHandler from '../../../server/api/auth/register.post'
import loginHandler from '../../../server/api/auth/login.post'
import logoutHandler from '../../../server/api/auth/logout.post'
import { EmailAlreadyRegisteredError } from '../../../server/contexts/platform/domain/errors/email-already-registered.error'
import { InvalidCredentialsError } from '../../../server/contexts/platform/domain/errors/invalid-credentials.error'
import { makeEvent } from './nuxt-runtime-stubs'

describe('POST /api/auth/register', () => {
  let registerUser: { execute: ReturnType<typeof vi.fn> }
  let container: { registerUser: typeof registerUser }

  beforeEach(() => {
    registerUser = { execute: vi.fn() }
    container = { registerUser }
  })

  it('returns the user and opens a session on success', async () => {
    registerUser.execute.mockResolvedValue({ userId: 'u1', email: 'alice@example.com' })
    const event = makeEvent({
      body: { email: 'alice@example.com', password: 'strongPassword123!' },
      container,
    })
    const result = await (registerHandler as any)(event)
    expect(result).toEqual({ user: { id: 'u1', email: 'alice@example.com' } })
    expect(event._session?.user).toEqual({ id: 'u1', email: 'alice@example.com' })
  })

  it('returns 400 when the payload is invalid', async () => {
    const event = makeEvent({ body: { email: 'not-an-email', password: 'short' }, container })
    await expect((registerHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(registerUser.execute).not.toHaveBeenCalled()
  })

  it('returns 409 when the email is already registered', async () => {
    registerUser.execute.mockRejectedValue(new EmailAlreadyRegisteredError())
    const event = makeEvent({
      body: { email: 'alice@example.com', password: 'strongPassword123!' },
      container,
    })
    await expect((registerHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('POST /api/auth/login', () => {
  let loginUser: { execute: ReturnType<typeof vi.fn> }
  let container: { loginUser: typeof loginUser }

  beforeEach(() => {
    loginUser = { execute: vi.fn() }
    container = { loginUser }
  })

  it('returns the user and opens a session on success', async () => {
    loginUser.execute.mockResolvedValue({ userId: 'u1', email: 'alice@example.com' })
    const event = makeEvent({
      body: { email: 'alice@example.com', password: 'strongPassword123!' },
      container,
    })
    const result = await (loginHandler as any)(event)
    expect(result).toEqual({ user: { id: 'u1', email: 'alice@example.com' } })
    expect(event._session?.user).toEqual({ id: 'u1', email: 'alice@example.com' })
  })

  it('returns 401 on invalid credentials', async () => {
    loginUser.execute.mockRejectedValue(new InvalidCredentialsError())
    const event = makeEvent({
      body: { email: 'alice@example.com', password: 'wrong' },
      container,
    })
    await expect((loginHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 400 on malformed payload', async () => {
    const event = makeEvent({ body: { email: 'not-an-email' }, container })
    await expect((loginHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the session', async () => {
    const event = makeEvent({
      session: { user: { id: 'u1', email: 'alice@example.com' } },
      container: {},
    })
    const result = await (logoutHandler as any)(event)
    expect(result).toEqual({ ok: true })
    expect(event._session).toBeUndefined()
  })
})
