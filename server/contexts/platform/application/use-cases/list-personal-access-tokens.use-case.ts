import type { IPersonalAccessTokenRepository } from '../../domain/ports/personal-access-token-repository.port'
import type { PersonalAccessTokenView } from './create-personal-access-token.use-case'

export interface ListPersonalAccessTokensInput {
  userId: string
}

export class ListPersonalAccessTokensUseCase {
  constructor(private readonly tokens: IPersonalAccessTokenRepository) {}

  async execute(input: ListPersonalAccessTokensInput): Promise<PersonalAccessTokenView[]> {
    const list = await this.tokens.listForUser(input.userId)
    return list
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((entity) => ({
        id: entity.id,
        name: entity.name,
        prefix: entity.prefix,
        createdAt: entity.createdAt,
        lastUsedAt: entity.lastUsedAt,
        revokedAt: entity.revokedAt,
      }))
  }
}
