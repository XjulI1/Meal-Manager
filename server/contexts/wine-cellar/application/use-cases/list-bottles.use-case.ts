import type { BottleListItemView } from '../../../../../shared/dto/wine-cellar'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { isDrinkableInYear } from '../../domain/value-objects/apogee-status.vo'
import { loadStructureIndex } from '../load-structure-index'
import { countBottlesByWine, toBottleView, toPlacementView, toWineView, wineMatchesQuery } from '../wine-cellar-views'

export interface ListBottlesInput {
  householdId: string
  color?: string
  region?: string
  domain?: string
  q?: string
  placement?: 'placed' | 'unplaced'
  drinkableInYear?: number
  sort?: 'name' | 'vintage' | 'region'
}

/** Filterable list of all in-stock bottles (placed + unplaced), enriched with wine data. */
export class ListBottlesUseCase {
  constructor(
    private readonly bottles: IBottleRepository,
    private readonly wines: IWineRepository,
    private readonly cellars: ICellarRepository,
  ) {}

  async execute(input: ListBottlesInput): Promise<BottleListItemView[]> {
    const inStock = await this.bottles.listInStock(input.householdId)
    const winesById = new Map((await this.wines.list(input.householdId)).map((w) => [w.id, w]))
    const counts = countBottlesByWine(inStock)
    const structure = await loadStructureIndex(this.cellars, input.householdId)

    let items: BottleListItemView[] = inStock.flatMap((bottle) => {
      const wine = winesById.get(bottle.wineId)
      if (!wine) return []
      return [{
        bottle: toBottleView(bottle, toPlacementView(bottle, structure)),
        wine: toWineView(wine, counts.get(wine.id) ?? 0),
      }]
    })

    if (input.color) items = items.filter((it) => it.wine.color === input.color)
    if (input.region) items = items.filter((it) => it.wine.region === input.region)
    if (input.domain) {
      const needle = input.domain.trim().toLowerCase()
      items = items.filter((it) => (it.wine.domain ?? '').toLowerCase().includes(needle))
    }
    if (input.q) items = items.filter((it) => wineMatchesQuery(it.wine, input.q!))
    if (input.placement === 'placed') items = items.filter((it) => it.bottle.placement !== null)
    if (input.placement === 'unplaced') items = items.filter((it) => it.bottle.placement === null)
    if (input.drinkableInYear !== undefined) {
      const y = input.drinkableInYear
      items = items.filter((it) => isDrinkableInYear(it.wine.gardeMin, it.wine.gardeMax, y))
    }

    const sort = input.sort ?? 'name'
    items.sort((a, b) => {
      if (sort === 'vintage') return (a.wine.vintage ?? 0) - (b.wine.vintage ?? 0)
      if (sort === 'region') return (a.wine.region ?? '').localeCompare(b.wine.region ?? '', 'fr')
      return a.wine.name.localeCompare(b.wine.name, 'fr')
    })

    return items
  }
}
