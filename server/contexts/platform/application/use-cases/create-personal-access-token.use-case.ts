import { randomUUID } from 'node:crypto'
import { PersonalAccessToken } from '../../domain/entities/personal-access-token.entity'
import { UserNotInHouseholdError } from '../../domain/errors/user-not-in-household.error'
import type { IPersonalAccessTokenRepository } from '../../domain/ports/personal-access-token-repository.port'
import type { ITokenGenerator } from '../../domain/ports/token-generator.port'
import type { IUserHouseholdResolver } from '../../domain/ports/user-household-resolver.port'

export interface CreatePersonalAccessTokenInput {
  userId: string
  name: string
}

export interface PersonalAccessTokenView {
  id: string
  name: string
  prefix: string
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

export interface CreatePersonalAccessTokenResult {
  plaintext: string
  token: PersonalAccessTokenView
}

export class CreatePersonalAccessTokenUseCase {
  constructor(
    private readonly tokens: IPersonalAccessTokenRepository,
    private readonly resolver: IUserHouseholdResolver,
    private readonly generator: ITokenGenerator,
    private readonly idGenerator: () => string = randomUUID,
  ) {}

  async execute(input: CreatePersonalAccessTokenInput): Promise<CreatePersonalAccessTokenResult> {
    const membership = await this.resolver.resolveForUser(input.userId)
    if (!membership) {
      throw new UserNotInHouseholdError()
    }

    const generated = this.generator.generate()
    const entity = PersonalAccessToken.create({
      id: this.idGenerator(),
      userId: input.userId,
      householdId: membership.householdId,
      name: input.name,
      tokenHash: generated.hash,
      prefix: generated.prefix,
    })

    await this.tokens.save(entity)

    return {
      plaintext: generated.plaintext,
      token: {
        id: entity.id,
        name: entity.name,
        prefix: entity.prefix,
        createdAt: entity.createdAt,
        lastUsedAt: entity.lastUsedAt,
        revokedAt: entity.revokedAt,
      },
    }
  }
}
