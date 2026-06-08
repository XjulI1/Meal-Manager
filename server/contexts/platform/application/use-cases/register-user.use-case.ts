import { randomUUID } from 'node:crypto'
import { User } from '../../domain/entities/user.entity'
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error'
import type { IPasswordHasher } from '../../domain/ports/password-hasher.port'
import type { IUserRepository } from '../../domain/ports/user-repository.port'

export interface RegisterUserInput {
  email: string
  password: string
}

export interface RegisterUserResult {
  userId: string
  email: string
  aiEnabled: boolean
}

export class RegisterUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly idGenerator: () => string = randomUUID,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResult> {
    const email = User.normalizeEmail(input.email)
    const existing = await this.users.findByEmail(email)
    if (existing) {
      throw new EmailAlreadyRegisteredError()
    }

    const passwordHash = await this.hasher.hash(input.password)
    const user = User.create({
      id: this.idGenerator(),
      email,
      passwordHash,
    })
    await this.users.save(user)

    return { userId: user.id, email: user.email, aiEnabled: user.aiEnabled }
  }
}
