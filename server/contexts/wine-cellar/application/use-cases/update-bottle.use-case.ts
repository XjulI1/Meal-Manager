import type { BottleView } from '../../../../../shared/dto/wine-cellar'
import type { BottleAttributes } from '../../domain/entities/bottle.entity'
import { BottleNotFoundError } from '../../domain/errors/bottle-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import { priceToCents, resolveBottleSize, type BottleSizeInput } from '../bottle-size'
import { loadStructureIndex } from '../load-structure-index'
import { toBottleView, toPlacementView } from '../wine-cellar-views'

export interface UpdateBottleInput {
  householdId: string
  id: string
  size?: BottleSizeInput
  /** `null` clears the price; `undefined` leaves it unchanged. */
  buyingPrice?: number | null
  /** `null` clears the date; `undefined` leaves it unchanged. */
  addedDate?: string | null
}

export class UpdateBottleUseCase {
  constructor(
    private readonly bottles: IBottleRepository,
    private readonly cellars: ICellarRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateBottleInput): Promise<BottleView> {
    const bottle = await this.bottles.findById(input.id, input.householdId)
    if (!bottle) throw new BottleNotFoundError(input.id)

    const attributes: BottleAttributes = {}
    if (input.size !== undefined) attributes.size = resolveBottleSize(input.size)
    if (input.buyingPrice !== undefined) attributes.buyingPriceCents = priceToCents(input.buyingPrice)
    if (input.addedDate !== undefined) attributes.addedDate = input.addedDate

    const updated = bottle.withAttributes(attributes, this.clock())
    await this.bottles.update(updated)

    const structure = await loadStructureIndex(this.cellars, input.householdId)
    return toBottleView(updated, toPlacementView(updated, structure))
  }
}
