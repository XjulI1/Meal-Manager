import { ShelfNotEmptyError } from '../../domain/errors/shelf-not-empty.error'
import { ShelfNotFoundError } from '../../domain/errors/shelf-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface DeleteShelfInput {
  householdId: string
  id: string
}

/** Deletes a shelf. Refused (ShelfNotEmptyError) while it still holds placed bottles. */
export class DeleteShelfUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly bottles: IBottleRepository,
  ) {}

  async execute(input: DeleteShelfInput): Promise<void> {
    const shelf = await this.cellars.findShelfById(input.id, input.householdId)
    if (!shelf) throw new ShelfNotFoundError(input.id)

    const rows = await this.cellars.listRowsByShelf(shelf.id, input.householdId)
    const rowIds = rows.map((r) => r.id)
    const placed = rowIds.length
      ? await this.bottles.listPlacedByRowIds(rowIds, input.householdId)
      : []
    if (placed.length > 0) {
      throw new ShelfNotEmptyError(shelf.id, placed.length)
    }

    await this.cellars.deleteShelf(shelf.id, input.householdId)
  }
}
