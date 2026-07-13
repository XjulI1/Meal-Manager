import type { CellarLayoutView } from '../../../../../shared/dto/wine-cellar'
import type { Row } from '../../domain/entities/row.entity'
import { CellarNotFoundError } from '../../domain/errors/cellar-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import {
  buildRowLayoutView,
  buildStructureIndex,
  countBottlesByWine,
} from '../wine-cellar-views'

export interface GetCellarLayoutInput {
  householdId: string
  cellarId: string
}

/** Returns the full 2D layout of a cellar (shelves → rows → slots with occupants). */
export class GetCellarLayoutUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly bottles: IBottleRepository,
    private readonly wines: IWineRepository,
  ) {}

  async execute(input: GetCellarLayoutInput): Promise<CellarLayoutView> {
    const cellar = await this.cellars.findCellarById(input.cellarId, input.householdId)
    if (!cellar) throw new CellarNotFoundError(input.cellarId)

    const shelves = (await this.cellars.listShelvesByCellar(cellar.id, input.householdId))
      .sort((a, b) => a.position - b.position)

    const rowsByShelf = new Map<string, Row[]>()
    const allRows: Row[] = []
    for (const shelf of shelves) {
      const rows = (await this.cellars.listRowsByShelf(shelf.id, input.householdId))
        .sort((a, b) => a.position - b.position)
      rowsByShelf.set(shelf.id, rows)
      allRows.push(...rows)
    }

    const inStock = await this.bottles.listInStock(input.householdId)
    const wineCounts = countBottlesByWine(inStock)
    const winesById = new Map((await this.wines.list(input.householdId)).map((w) => [w.id, w]))
    const index = buildStructureIndex([cellar], shelves, allRows)

    const rowIds = new Set(allRows.map((r) => r.id))
    const placedInCellar = inStock.filter((b) => b.position && rowIds.has(b.position.rowId))
    const bottlesByRow = new Map<string, typeof placedInCellar>()
    for (const bottle of placedInCellar) {
      const rowId = bottle.position!.rowId
      const list = bottlesByRow.get(rowId) ?? []
      list.push(bottle)
      bottlesByRow.set(rowId, list)
    }

    return {
      id: cellar.id,
      name: cellar.name,
      shelves: shelves.map((shelf) => ({
        id: shelf.id,
        label: shelf.label,
        position: shelf.position,
        rows: (rowsByShelf.get(shelf.id) ?? []).map((row) =>
          buildRowLayoutView(row, bottlesByRow.get(row.id) ?? [], winesById, index, wineCounts),
        ),
      })),
    }
  }
}
