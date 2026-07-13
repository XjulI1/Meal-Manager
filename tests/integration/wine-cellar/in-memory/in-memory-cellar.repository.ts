import type { Cellar } from '../../../../server/contexts/wine-cellar/domain/entities/cellar.entity'
import type { Row } from '../../../../server/contexts/wine-cellar/domain/entities/row.entity'
import type { Shelf } from '../../../../server/contexts/wine-cellar/domain/entities/shelf.entity'
import type { ICellarRepository } from '../../../../server/contexts/wine-cellar/domain/ports/cellar-repository.port'

export class InMemoryCellarRepository implements ICellarRepository {
  readonly cellars = new Map<string, Cellar>()
  readonly shelves = new Map<string, Shelf>()
  readonly rows = new Map<string, Row>()

  async createCellar(cellar: Cellar): Promise<void> {
    this.cellars.set(cellar.id, cellar)
  }

  async findCellarById(id: string, householdId: string): Promise<Cellar | null> {
    const c = this.cellars.get(id)
    return c && c.householdId === householdId ? c : null
  }

  async listCellars(householdId: string): Promise<Cellar[]> {
    return [...this.cellars.values()]
      .filter((c) => c.householdId === householdId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async updateCellar(cellar: Cellar): Promise<void> {
    this.cellars.set(cellar.id, cellar)
  }

  async deleteCellar(id: string, householdId: string): Promise<void> {
    const c = this.cellars.get(id)
    if (!c || c.householdId !== householdId) return
    for (const shelf of [...this.shelves.values()].filter((s) => s.cellarId === id)) {
      await this.deleteShelf(shelf.id, householdId)
    }
    this.cellars.delete(id)
  }

  async createShelf(shelf: Shelf): Promise<void> {
    this.shelves.set(shelf.id, shelf)
  }

  async findShelfById(id: string, householdId: string): Promise<Shelf | null> {
    const s = this.shelves.get(id)
    return s && s.householdId === householdId ? s : null
  }

  async listShelvesByCellar(cellarId: string, householdId: string): Promise<Shelf[]> {
    return [...this.shelves.values()]
      .filter((s) => s.cellarId === cellarId && s.householdId === householdId)
      .sort((a, b) => a.position - b.position)
  }

  async updateShelf(shelf: Shelf): Promise<void> {
    this.shelves.set(shelf.id, shelf)
  }

  async deleteShelf(id: string, householdId: string): Promise<void> {
    const s = this.shelves.get(id)
    if (!s || s.householdId !== householdId) return
    for (const row of [...this.rows.values()].filter((r) => r.shelfId === id)) {
      this.rows.delete(row.id)
    }
    this.shelves.delete(id)
  }

  async createRow(row: Row): Promise<void> {
    this.rows.set(row.id, row)
  }

  async findRowById(id: string, householdId: string): Promise<Row | null> {
    const r = this.rows.get(id)
    return r && r.householdId === householdId ? r : null
  }

  async listRowsByShelf(shelfId: string, householdId: string): Promise<Row[]> {
    return [...this.rows.values()]
      .filter((r) => r.shelfId === shelfId && r.householdId === householdId)
      .sort((a, b) => a.position - b.position)
  }

  async updateRow(row: Row): Promise<void> {
    this.rows.set(row.id, row)
  }

  async deleteRow(id: string, householdId: string): Promise<void> {
    const r = this.rows.get(id)
    if (r && r.householdId === householdId) this.rows.delete(id)
  }
}
