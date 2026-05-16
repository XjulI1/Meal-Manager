import type { PersonalAccessToken } from '../../../../server/contexts/platform/domain/entities/personal-access-token.entity'
import type { IPersonalAccessTokenRepository } from '../../../../server/contexts/platform/domain/ports/personal-access-token-repository.port'

export class InMemoryPersonalAccessTokenRepository implements IPersonalAccessTokenRepository {
  private readonly byId = new Map<string, PersonalAccessToken>()

  async findById(id: string): Promise<PersonalAccessToken | null> {
    return this.byId.get(id) ?? null
  }

  async findActiveByHash(tokenHash: string): Promise<PersonalAccessToken | null> {
    for (const token of this.byId.values()) {
      if (token.tokenHash === tokenHash && token.isActive) return token
    }
    return null
  }

  async listForUser(userId: string): Promise<PersonalAccessToken[]> {
    return Array.from(this.byId.values()).filter((t) => t.userId === userId)
  }

  async save(token: PersonalAccessToken): Promise<void> {
    this.byId.set(token.id, token)
  }

  async touchLastUsed(id: string, at: Date): Promise<void> {
    const token = this.byId.get(id)
    if (token) token.markUsed(at)
  }

  get size(): number {
    return this.byId.size
  }
}
