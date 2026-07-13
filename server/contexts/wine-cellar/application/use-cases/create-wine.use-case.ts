import { randomUUID } from 'node:crypto'
import type { WineView } from '../../../../../shared/dto/wine-cellar'
import { Wine } from '../../domain/entities/wine.entity'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { createWineAttributes, type WineInput } from '../wine-attributes'
import { toWineView } from '../wine-cellar-views'

export interface CreateWineInput extends WineInput {
  householdId: string
}

export class CreateWineUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateWineInput): Promise<WineView> {
    const wine = Wine.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      attributes: createWineAttributes(input),
      now: this.clock(),
    })
    await this.wines.create(wine)
    return toWineView(wine, 0)
  }
}
