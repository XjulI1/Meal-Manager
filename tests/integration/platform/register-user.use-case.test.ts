import { beforeEach, describe, expect, it } from 'vitest'
import { RegisterUserUseCase } from '../../../server/contexts/platform/application/use-cases/register-user.use-case'
import { EmailAlreadyRegisteredError } from '../../../server/contexts/platform/domain/errors/email-already-registered.error'
import { FakePasswordHasher } from './in-memory/fake-password-hasher'
import { InMemoryUserRepository } from './in-memory/in-memory-user.repository'

describe('RegisterUserUseCase', () => {
  let users: InMemoryUserRepository
  let hasher: FakePasswordHasher
  let useCase: RegisterUserUseCase
  let nextId: () => string

  beforeEach(() => {
    users = new InMemoryUserRepository()
    hasher = new FakePasswordHasher()
    let counter = 0
    nextId = () => `user-${++counter}`
    useCase = new RegisterUserUseCase(users, hasher, nextId)
  })

  it('creates a new user and stores the password hashed', async () => {
    const result = await useCase.execute({
      email: 'Alice@Example.com',
      password: 'strongPassword123!',
    })

    expect(result).toEqual({ userId: 'user-1', email: 'alice@example.com', aiEnabled: false })
    const stored = await users.findByEmail('alice@example.com')
    expect(stored).not.toBeNull()
    expect(stored?.passwordHash).toBe('hashed:strongPassword123!')
  })

  it('rejects when the email is already registered (case-insensitive)', async () => {
    await useCase.execute({ email: 'alice@example.com', password: 'strongPassword123!' })

    await expect(
      useCase.execute({ email: 'ALICE@example.com', password: 'anotherStrongPass!' }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError)

    expect(users.size).toBe(1)
  })
})
