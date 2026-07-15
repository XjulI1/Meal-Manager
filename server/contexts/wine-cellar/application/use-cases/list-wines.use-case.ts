import type { WineView } from '../../../../../shared/dto/wine-cellar'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { countBottlesByWine, toWineView, wineMatchesQuery } from '../wine-cellar-views'

export interface ListWinesInput {
  householdId: string
  color?: string
  region?: string
  domain?: string
  q?: string
  sort?: 'name' | 'vintage' | 'region'
}

export class ListWinesUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
  ) {}

  async execute(input: ListWinesInput): Promise<WineView[]> {
    const wines = await this.wines.list(input.householdId)
    const counts = countBottlesByWine(await this.bottles.listInStock(input.householdId))
    let views = wines.map((wine) => toWineView(wine, counts.get(wine.id) ?? 0))

    if (input.color) views = views.filter((w) => w.color === input.color)
    if (input.region) views = views.filter((w) => w.region === input.region)
    if (input.domain) {
      const needle = input.domain.trim().toLowerCase()
      views = views.filter((w) => (w.domain ?? '').toLowerCase().includes(needle))
    }
    if (input.q) views = views.filter((w) => wineMatchesQuery(w, input.q!))

    const sort = input.sort ?? 'name'
    views.sort((a, b) => {
      if (sort === 'vintage') return (a.vintage ?? 0) - (b.vintage ?? 0)
      if (sort === 'region') return (a.region ?? '').localeCompare(b.region ?? '', 'fr')
      return a.name.localeCompare(b.name, 'fr')
    })

    return views
  }
}
