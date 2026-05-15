import type { User } from '../../../../server/contexts/platform/domain/entities/user.entity'
import type { IUserRepository } from '../../../../server/contexts/platform/domain/ports/user-repository.port'

export class InMemoryUserRepository implements IUserRepository {
  private readonly byId = new Map<string, User>()

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase()
    for (const user of this.byId.values()) {
      if (user.email === normalized) return user
    }
    return null
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user)
  }

  get size(): number {
    return this.byId.size
  }
}
