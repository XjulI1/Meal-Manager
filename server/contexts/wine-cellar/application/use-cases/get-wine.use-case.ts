import type { BottleView, WineView } from '../../../../../shared/dto/wine-cellar'
import { WineNotFoundError } from '../../domain/errors/wine-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { buildStructureIndex, toBottleView, toPlacementView, toWineView } from '../wine-cellar-views'

export interface GetWineInput {
  householdId: string
  id: string
}

export interface GetWineResult {
  wine: WineView
  bottles: BottleView[]
}

export class GetWineUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
    private readonly cellars: ICellarRepository,
  ) {}

  async execute(input: GetWineInput): Promise<GetWineResult> {
    const wine = await this.wines.findById(input.id, input.householdId)
    if (!wine) throw new WineNotFoundError(input.id)

    const bottles = await this.bottles.listByWine(wine.id, input.householdId)

    // Resolve placement paths across the household structure.
    const cellars = await this.cellars.listCellars(input.householdId)
    const shelves = (await Promise.all(
      cellars.map((c) => this.cellars.listShelvesByCellar(c.id, input.householdId)),
    )).flat()
    const rows = (await Promise.all(
      shelves.map((s) => this.cellars.listRowsByShelf(s.id, input.householdId)),
    )).flat()
    const index = buildStructureIndex(cellars, shelves, rows)

    return {
      wine: toWineView(wine, bottles.length),
      bottles: bottles.map((b) => toBottleView(b, toPlacementView(b, index))),
    }
  }
}
