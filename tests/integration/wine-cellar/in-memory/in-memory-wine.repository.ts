import type { Wine } from '../../../../server/contexts/wine-cellar/domain/entities/wine.entity'
import type { IWineRepository } from '../../../../server/contexts/wine-cellar/domain/ports/wine-repository.port'

export class InMemoryWineRepository implements IWineRepository {
  readonly wines = new Map<string, Wine>()

  async create(wine: Wine): Promise<void> {
    this.wines.set(wine.id, wine)
  }

  async findById(id: string, householdId: string): Promise<Wine | null> {
    const w = this.wines.get(id)
    return w && w.householdId === householdId ? w : null
  }

  async list(householdId: string): Promise<Wine[]> {
    return [...this.wines.values()]
      .filter((w) => w.householdId === householdId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async update(wine: Wine): Promise<void> {
    this.wines.set(wine.id, wine)
  }
}
