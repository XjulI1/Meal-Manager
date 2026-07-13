import type { WineView } from '../../../../../shared/dto/wine-cellar'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { countBottlesByWine, toWineView } from '../wine-cellar-views'

export interface ListWinesInput {
  householdId: string
}

export class ListWinesUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
  ) {}

  async execute(input: ListWinesInput): Promise<WineView[]> {
    const wines = await this.wines.list(input.householdId)
    const counts = countBottlesByWine(await this.bottles.listInStock(input.householdId))
    return wines
      .map((wine) => toWineView(wine, counts.get(wine.id) ?? 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }
}
