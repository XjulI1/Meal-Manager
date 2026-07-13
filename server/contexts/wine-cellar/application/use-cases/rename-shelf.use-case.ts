import { ShelfNotFoundError } from '../../domain/errors/shelf-not-found.error'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface RenameShelfInput {
  householdId: string
  id: string
  label: string | null
}

export interface RenameShelfResult {
  id: string
  label: string | null
  position: number
}

export class RenameShelfUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: RenameShelfInput): Promise<RenameShelfResult> {
    const shelf = await this.cellars.findShelfById(input.id, input.householdId)
    if (!shelf) throw new ShelfNotFoundError(input.id)

    const renamed = shelf.withLabel(input.label, this.clock())
    await this.cellars.updateShelf(renamed)

    return { id: renamed.id, label: renamed.label, position: renamed.position }
  }
}
