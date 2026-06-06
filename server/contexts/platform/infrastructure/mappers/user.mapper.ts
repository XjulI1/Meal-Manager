import type { NewUserRow, UserRow } from '../../../../database/schema/users'
import { User } from '../../domain/entities/user.entity'

export const UserMapper = {
  toDomain(row: UserRow): User {
    return User.rehydrate({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      aiEnabled: row.aiEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(user: User): NewUserRow {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      aiEnabled: user.aiEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  },
}
