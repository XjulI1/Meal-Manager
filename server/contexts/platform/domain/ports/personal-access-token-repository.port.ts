import type { PersonalAccessToken } from '../entities/personal-access-token.entity'

export interface IPersonalAccessTokenRepository {
  findById(id: string): Promise<PersonalAccessToken | null>
  findActiveByHash(tokenHash: string): Promise<PersonalAccessToken | null>
  listForUser(userId: string): Promise<PersonalAccessToken[]>
  save(token: PersonalAccessToken): Promise<void>
  touchLastUsed(id: string, at: Date): Promise<void>
}
