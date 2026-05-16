import type { NewPersonalAccessTokenRow, PersonalAccessTokenRow } from '../../../../database/schema/personal-access-tokens'
import { PersonalAccessToken } from '../../domain/entities/personal-access-token.entity'

export const PersonalAccessTokenMapper = {
  toDomain(row: PersonalAccessTokenRow): PersonalAccessToken {
    return PersonalAccessToken.rehydrate({
      id: row.id,
      userId: row.userId,
      householdId: row.householdId,
      name: row.name,
      tokenHash: row.tokenHash,
      prefix: row.prefix,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt ?? null,
      revokedAt: row.revokedAt ?? null,
    })
  },

  toPersistence(token: PersonalAccessToken): NewPersonalAccessTokenRow {
    return {
      id: token.id,
      userId: token.userId,
      householdId: token.householdId,
      name: token.name,
      tokenHash: token.tokenHash,
      prefix: token.prefix,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt,
      revokedAt: token.revokedAt,
    }
  },
}
