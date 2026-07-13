import type { CellarView } from '../../../../../shared/dto/wine-cellar'
import { CellarNotFoundError } from '../../domain/errors/cellar-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface RenameCellarInput {
  householdId: string
  id: string
  name: string
}

export class RenameCellarUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly bottles: IBottleRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: RenameCellarInput): Promise<CellarView> {
    const cellar = await this.cellars.findCellarById(input.id, input.householdId)
    if (!cellar) throw new CellarNotFoundError(input.id)

    const renamed = cellar.withName(input.name, this.clock())
    await this.cellars.updateCellar(renamed)

    const shelves = await this.cellars.listShelvesByCellar(cellar.id, input.householdId)
    const rowLists = await Promise.all(
      shelves.map((s) => this.cellars.listRowsByShelf(s.id, input.householdId)),
    )
    const rowIds = rowLists.flat().map((r) => r.id)
    const placed = rowIds.length
      ? await this.bottles.listPlacedByRowIds(rowIds, input.householdId)
      : []

    return {
      id: renamed.id,
      name: renamed.name,
      shelfCount: shelves.length,
      bottleCount: placed.length,
    }
  }
}
