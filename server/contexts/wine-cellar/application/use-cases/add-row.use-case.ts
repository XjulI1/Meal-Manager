import { randomUUID } from 'node:crypto'
import type { RowLayoutView } from '../../../../../shared/dto/wine-cellar'
import { Row } from '../../domain/entities/row.entity'
import { ShelfNotFoundError } from '../../domain/errors/shelf-not-found.error'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import { buildRowLayoutView, buildStructureIndex } from '../wine-cellar-views'

export interface AddRowInput {
  householdId: string
  shelfId: string
  position?: number
  capacityBack: number
  capacityFront: number
}

export class AddRowUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddRowInput): Promise<RowLayoutView> {
    const shelf = await this.cellars.findShelfById(input.shelfId, input.householdId)
    if (!shelf) throw new ShelfNotFoundError(input.shelfId)

    const existing = await this.cellars.listRowsByShelf(shelf.id, input.householdId)
    const position = input.position ?? existing.length + 1

    const row = Row.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      shelfId: shelf.id,
      position,
      capacityBack: input.capacityBack,
      capacityFront: input.capacityFront,
      now: this.clock(),
    })
    await this.cellars.createRow(row)

    return buildRowLayoutView(row, [], new Map(), buildStructureIndex([], [], [row]), new Map())
  }
}
