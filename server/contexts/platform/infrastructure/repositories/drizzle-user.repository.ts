import { eq } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { users } from '../../../../database/schema/users'
import type { User } from '../../domain/entities/user.entity'
import type { IUserRepository } from '../../domain/ports/user-repository.port'
import { UserMapper } from '../mappers/user.mapper'

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    const row = rows[0]
    return row ? UserMapper.toDomain(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    const row = rows[0]
    return row ? UserMapper.toDomain(row) : null
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toPersistence(user)
    await this.db
      .insert(users)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          email: row.email,
          passwordHash: row.passwordHash,
          updatedAt: row.updatedAt,
        },
      })
  }
}
