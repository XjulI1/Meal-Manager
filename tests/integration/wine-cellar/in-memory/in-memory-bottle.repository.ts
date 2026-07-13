import type { Bottle } from '../../../../server/contexts/wine-cellar/domain/entities/bottle.entity'
import type { IBottleRepository } from '../../../../server/contexts/wine-cellar/domain/ports/bottle-repository.port'
import type { BottleDepth } from '../../../../server/contexts/wine-cellar/domain/value-objects/slot-position.vo'

export class InMemoryBottleRepository implements IBottleRepository {
  readonly bottles = new Map<string, Bottle>()

  async create(bottle: Bottle): Promise<void> {
    this.bottles.set(bottle.id, bottle)
  }

  async createMany(bottles: Bottle[]): Promise<void> {
    for (const bottle of bottles) this.bottles.set(bottle.id, bottle)
  }

  async findById(id: string, householdId: string): Promise<Bottle | null> {
    const b = this.bottles.get(id)
    return b && b.householdId === householdId ? b : null
  }

  async findBySlot(
    rowId: string,
    depth: BottleDepth,
    index: number,
    householdId: string,
  ): Promise<Bottle | null> {
    for (const b of this.bottles.values()) {
      if (
        b.householdId === householdId
        && b.isInStock
        && b.position
        && b.position.rowId === rowId
        && b.position.depth === depth
        && b.position.index === index
      ) {
        return b
      }
    }
    return null
  }

  async listPlacedByRowIds(rowIds: string[], householdId: string): Promise<Bottle[]> {
    const set = new Set(rowIds)
    return [...this.bottles.values()].filter(
      (b) => b.householdId === householdId && b.isInStock && b.position && set.has(b.position.rowId),
    )
  }

  async listInStock(householdId: string): Promise<Bottle[]> {
    return [...this.bottles.values()].filter((b) => b.householdId === householdId && b.isInStock)
  }

  async listByWine(wineId: string, householdId: string): Promise<Bottle[]> {
    return [...this.bottles.values()].filter(
      (b) => b.householdId === householdId && b.wineId === wineId && b.isInStock,
    )
  }

  async listConsumed(householdId: string): Promise<Bottle[]> {
    return [...this.bottles.values()]
      .filter((b) => b.householdId === householdId && b.status === 'consumed')
      .sort((a, b) => (b.exit?.date ?? '').localeCompare(a.exit?.date ?? ''))
  }

  async update(bottle: Bottle): Promise<void> {
    this.bottles.set(bottle.id, bottle)
  }
}
