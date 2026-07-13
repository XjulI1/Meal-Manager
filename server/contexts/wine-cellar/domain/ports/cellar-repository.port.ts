import type { Cellar } from '../entities/cellar.entity'
import type { Row } from '../entities/row.entity'
import type { Shelf } from '../entities/shelf.entity'

/**
 * Persistence for the cellar structure aggregate (cellar → shelves → rows).
 * All reads are scoped by `householdId`; a resource from another household
 * MUST be treated as absent (returns null / empty).
 */
export interface ICellarRepository {
  // Cellars
  createCellar(cellar: Cellar): Promise<void>
  findCellarById(id: string, householdId: string): Promise<Cellar | null>
  listCellars(householdId: string): Promise<Cellar[]>
  updateCellar(cellar: Cellar): Promise<void>
  deleteCellar(id: string, householdId: string): Promise<void>

  // Shelves
  createShelf(shelf: Shelf): Promise<void>
  findShelfById(id: string, householdId: string): Promise<Shelf | null>
  listShelvesByCellar(cellarId: string, householdId: string): Promise<Shelf[]>
  updateShelf(shelf: Shelf): Promise<void>
  deleteShelf(id: string, householdId: string): Promise<void>

  // Rows
  createRow(row: Row): Promise<void>
  findRowById(id: string, householdId: string): Promise<Row | null>
  listRowsByShelf(shelfId: string, householdId: string): Promise<Row[]>
  updateRow(row: Row): Promise<void>
  deleteRow(id: string, householdId: string): Promise<void>
}
