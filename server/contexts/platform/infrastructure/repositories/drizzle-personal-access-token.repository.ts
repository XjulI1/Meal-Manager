import { and, desc, eq, isNull } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { personalAccessTokens } from '../../../../database/schema/personal-access-tokens'
import type { PersonalAccessToken } from '../../domain/entities/personal-access-token.entity'
import type { IPersonalAccessTokenRepository } from '../../domain/ports/personal-access-token-repository.port'
import { PersonalAccessTokenMapper } from '../mappers/personal-access-token.mapper'

export class DrizzlePersonalAccessTokenRepository implements IPersonalAccessTokenRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<PersonalAccessToken | null> {
    const rows = await this.db
      .select()
      .from(personalAccessTokens)
      .where(eq(personalAccessTokens.id, id))
      .limit(1)
    const row = rows[0]
    return row ? PersonalAccessTokenMapper.toDomain(row) : null
  }

  async findActiveByHash(tokenHash: string): Promise<PersonalAccessToken | null> {
    const rows = await this.db
      .select()
      .from(personalAccessTokens)
      .where(
        and(eq(personalAccessTokens.tokenHash, tokenHash), isNull(personalAccessTokens.revokedAt)),
      )
      .limit(1)
    const row = rows[0]
    return row ? PersonalAccessTokenMapper.toDomain(row) : null
  }

  async listForUser(userId: string): Promise<PersonalAccessToken[]> {
    const rows = await this.db
      .select()
      .from(personalAccessTokens)
      .where(eq(personalAccessTokens.userId, userId))
      .orderBy(desc(personalAccessTokens.createdAt))
    return rows.map((r) => PersonalAccessTokenMapper.toDomain(r))
  }

  async save(token: PersonalAccessToken): Promise<void> {
    const row = PersonalAccessTokenMapper.toPersistence(token)
    await this.db
      .insert(personalAccessTokens)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          name: row.name,
          lastUsedAt: row.lastUsedAt,
          revokedAt: row.revokedAt,
        },
      })
  }

  async touchLastUsed(id: string, at: Date): Promise<void> {
    await this.db
      .update(personalAccessTokens)
      .set({ lastUsedAt: at })
      .where(eq(personalAccessTokens.id, id))
  }
}
