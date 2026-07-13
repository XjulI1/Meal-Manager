import type { CellarView } from '../../../../../shared/dto/wine-cellar'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface ListCellarsInput {
  householdId: string
}

/** Lists the household cellars with their shelf and placed-bottle counts. */
export class ListCellarsUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly bottles: IBottleRepository,
  ) {}

  async execute(input: ListCellarsInput): Promise<CellarView[]> {
    const cellars = await this.cellars.listCellars(input.householdId)
    const result: CellarView[] = []
    for (const cellar of cellars) {
      const shelves = await this.cellars.listShelvesByCellar(cellar.id, input.householdId)
      const rowLists = await Promise.all(
        shelves.map((s) => this.cellars.listRowsByShelf(s.id, input.householdId)),
      )
      const rowIds = rowLists.flat().map((r) => r.id)
      const placed = rowIds.length
        ? await this.bottles.listPlacedByRowIds(rowIds, input.householdId)
        : []
      result.push({
        id: cellar.id,
        name: cellar.name,
        shelfCount: shelves.length,
        bottleCount: placed.length,
      })
    }
    return result
  }
}
