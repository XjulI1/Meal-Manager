import { TokenNotFoundError } from '../../domain/errors/token-not-found.error'
import type { IPersonalAccessTokenRepository } from '../../domain/ports/personal-access-token-repository.port'

export interface RevokePersonalAccessTokenInput {
  userId: string
  tokenId: string
}

export class RevokePersonalAccessTokenUseCase {
  constructor(private readonly tokens: IPersonalAccessTokenRepository) {}

  async execute(input: RevokePersonalAccessTokenInput): Promise<void> {
    const token = await this.tokens.findById(input.tokenId)
    // Treat "not owned by current user" the same as "not found" — never reveal
    // the existence of other users' tokens.
    if (!token || token.userId !== input.userId) {
      throw new TokenNotFoundError()
    }
    if (!token.isActive) {
      // Idempotent: already revoked is a no-op success.
      return
    }
    token.revoke()
    await this.tokens.save(token)
  }
}
