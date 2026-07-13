import { randomUUID } from 'node:crypto'
import type { BottleView } from '../../../../../shared/dto/wine-cellar'
import { Bottle } from '../../domain/entities/bottle.entity'
import { WineNotFoundError } from '../../domain/errors/wine-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { priceToCents, resolveBottleSize, type BottleSizeInput } from '../bottle-size'
import { toBottleView } from '../wine-cellar-views'

export interface AddBottlesInput {
  householdId: string
  wineId: string
  quantity: number
  size?: BottleSizeInput
  buyingPrice?: number
  addedDate?: string
}

export interface AddBottlesResult {
  created: number
  bottles: BottleView[]
}

/** Adds N distinct, unplaced bottle instances of a wine to the "à ranger" pool. */
export class AddBottlesUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddBottlesInput): Promise<AddBottlesResult> {
    const wine = await this.wines.findById(input.wineId, input.householdId)
    if (!wine) throw new WineNotFoundError(input.wineId)

    const size = resolveBottleSize(input.size)
    const buyingPriceCents = priceToCents(input.buyingPrice)
    const now = this.clock()

    const created: Bottle[] = []
    for (let i = 0; i < input.quantity; i++) {
      created.push(Bottle.create({
        id: this.idGenerator(),
        householdId: input.householdId,
        wineId: wine.id,
        size,
        buyingPriceCents,
        addedDate: input.addedDate ?? null,
        position: null,
        now,
      }))
    }
    await this.bottles.createMany(created)

    return {
      created: created.length,
      bottles: created.map((b) => toBottleView(b, null)),
    }
  }
}
