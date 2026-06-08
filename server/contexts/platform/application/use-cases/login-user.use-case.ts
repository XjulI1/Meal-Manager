import { User } from '../../domain/entities/user.entity'
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error'
import type { IPasswordHasher } from '../../domain/ports/password-hasher.port'
import type { IUserRepository } from '../../domain/ports/user-repository.port'

export interface LoginUserInput {
  email: string
  password: string
}

export interface LoginUserResult {
  userId: string
  email: string
  aiEnabled: boolean
}

export class LoginUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserResult> {
    const email = User.normalizeEmail(input.email)
    const user = await this.users.findByEmail(email)

    // To mitigate timing attacks, always run a verification — even when the
    // user does not exist — against a deterministic dummy hash.
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH
    const ok = await this.hasher.verify(hashToCheck, input.password)
    if (!user || !ok) {
      throw new InvalidCredentialsError()
    }

    return { userId: user.id, email: user.email, aiEnabled: user.aiEnabled }
  }
}

// Argon2id of a random password generated once at module load. Not a secret;
// only used to keep the timing of login attempts uniform when the email is
// unknown.
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYQ$1bIQk2RAUNvWHwUFD8sCqA1zjNi+P/Qz4ScRTV2bN7w'
