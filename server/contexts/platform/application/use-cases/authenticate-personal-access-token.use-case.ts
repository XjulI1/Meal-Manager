import { InvalidTokenError } from '../../domain/errors/invalid-token.error'
import type { IPersonalAccessTokenRepository } from '../../domain/ports/personal-access-token-repository.port'
import type { ITokenGenerator } from '../../domain/ports/token-generator.port'

export interface AuthenticatePersonalAccessTokenInput {
  plaintext: string
}

export interface AuthenticatedTokenContext {
  userId: string
  householdId: string
}

export class AuthenticatePersonalAccessTokenUseCase {
  constructor(
    private readonly tokens: IPersonalAccessTokenRepository,
    private readonly generator: ITokenGenerator,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AuthenticatePersonalAccessTokenInput): Promise<AuthenticatedTokenContext> {
    const plaintext = input.plaintext.trim()
    if (!plaintext.startsWith('mm_pat_')) {
      throw new InvalidTokenError()
    }

    const hash = this.generator.hash(plaintext)
    const token = await this.tokens.findActiveByHash(hash)
    if (!token) {
      throw new InvalidTokenError()
    }

    // Fire-and-forget timestamp update: a transient DB error here MUST NOT
    // invalidate an otherwise successful authentication.
    const now = this.clock()
    this.tokens.touchLastUsed(token.id, now).catch(() => {
      /* swallow */
    })

    return { userId: token.userId, householdId: token.householdId }
  }
}
