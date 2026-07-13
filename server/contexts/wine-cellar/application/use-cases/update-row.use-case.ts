import type { RowLayoutView } from '../../../../../shared/dto/wine-cellar'
import { CapacityBelowOccupancyError } from '../../domain/errors/capacity-below-occupancy.error'
import { RowNotFoundError } from '../../domain/errors/row-not-found.error'
import type { BottleDepth } from '../../domain/value-objects/slot-position.vo'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { buildRowLayoutView, buildStructureIndex, countBottlesByWine } from '../wine-cellar-views'

export interface UpdateRowInput {
  householdId: string
  id: string
  position?: number
  capacityBack?: number
  capacityFront?: number
}

export class UpdateRowUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly bottles: IBottleRepository,
    private readonly wines: IWineRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateRowInput): Promise<RowLayoutView> {
    const row = await this.cellars.findRowById(input.id, input.householdId)
    if (!row) throw new RowNotFoundError(input.id)

    const newBack = input.capacityBack ?? row.capacityBack
    const newFront = input.capacityFront ?? row.capacityFront

    const placed = await this.bottles.listPlacedByRowIds([row.id], input.householdId)
    const maxIndex = (depth: BottleDepth): number =>
      placed
        .filter((b) => b.position && b.position.depth === depth)
        .reduce((max, b) => Math.max(max, b.position!.index), 0)

    const occBack = maxIndex('back')
    if (newBack < occBack) {
      throw new CapacityBelowOccupancyError(row.id, 'back', newBack, occBack)
    }
    const occFront = maxIndex('front')
    if (newFront < occFront) {
      throw new CapacityBelowOccupancyError(row.id, 'front', newFront, occFront)
    }

    const now = this.clock()
    let updated = row.withCapacities(newBack, newFront, now)
    if (input.position !== undefined) {
      updated = updated.withPosition(input.position, now)
    }
    await this.cellars.updateRow(updated)

    const winesById = new Map((await this.wines.list(input.householdId)).map((w) => [w.id, w]))
    const wineCounts = countBottlesByWine(await this.bottles.listInStock(input.householdId))
    return buildRowLayoutView(
      updated,
      placed,
      winesById,
      buildStructureIndex([], [], [updated]),
      wineCounts,
    )
  }
}
