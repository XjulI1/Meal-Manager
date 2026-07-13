import { CellarNotFoundError } from '../../domain/errors/cellar-not-found.error'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface DeleteCellarInput {
  householdId: string
  id: string
}

/**
 * Deletes a cellar and its whole structure (shelves → rows cascade in the DB).
 * Bottles placed in the cellar are returned to the pool by the repository
 * (their position is cleared) rather than deleted — they belong to the wine
 * collection, not the physical cellar.
 */
export class DeleteCellarUseCase {
  constructor(private readonly cellars: ICellarRepository) {}

  async execute(input: DeleteCellarInput): Promise<void> {
    const cellar = await this.cellars.findCellarById(input.id, input.householdId)
    if (!cellar) throw new CellarNotFoundError(input.id)
    await this.cellars.deleteCellar(input.id, input.householdId)
  }
}
