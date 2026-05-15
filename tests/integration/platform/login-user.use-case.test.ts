import { beforeEach, describe, expect, it } from 'vitest'
import { LoginUserUseCase } from '../../../server/contexts/platform/application/use-cases/login-user.use-case'
import { RegisterUserUseCase } from '../../../server/contexts/platform/application/use-cases/register-user.use-case'
import { InvalidCredentialsError } from '../../../server/contexts/platform/domain/errors/invalid-credentials.error'
import { FakePasswordHasher } from './in-memory/fake-password-hasher'
import { InMemoryUserRepository } from './in-memory/in-memory-user.repository'

describe('LoginUserUseCase', () => {
  let users: InMemoryUserRepository
  let hasher: FakePasswordHasher
  let login: LoginUserUseCase

  beforeEach(async () => {
    users = new InMemoryUserRepository()
    hasher = new FakePasswordHasher()
    const register = new RegisterUserUseCase(users, hasher, () => 'user-1')
    await register.execute({ email: 'alice@example.com', password: 'strongPassword123!' })
    login = new LoginUserUseCase(users, hasher)
  })

  it('authenticates a user with the correct password', async () => {
    const result = await login.execute({
      email: 'ALICE@example.com',
      password: 'strongPassword123!',
    })
    expect(result).toEqual({ userId: 'user-1', email: 'alice@example.com' })
  })

  it('rejects when the password does not match', async () => {
    await expect(
      login.execute({ email: 'alice@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('rejects when the email is unknown (without revealing it)', async () => {
    await expect(
      login.execute({ email: 'unknown@example.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
