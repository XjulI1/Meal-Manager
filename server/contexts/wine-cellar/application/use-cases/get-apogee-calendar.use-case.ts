import type { ApogeeCalendarView } from '../../../../../shared/dto/wine-cellar'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { computeApogeeStatus } from '../../domain/value-objects/apogee-status.vo'
import { countBottlesByWine, toWineView } from '../wine-cellar-views'

export interface GetApogeeCalendarInput {
  householdId: string
  /** Reference year for status classification (defaults to the current year). */
  refYear?: number
}

/**
 * Aggregates the household's wines that have at least one in-stock bottle,
 * grouped by cuvée, each tagged with its apogée status for the reference year.
 * Returns a flat list; the dashboard buckets and the year timeline are derived
 * client-side from it.
 */
export class GetApogeeCalendarUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: GetApogeeCalendarInput): Promise<ApogeeCalendarView> {
    const refYear = input.refYear ?? this.clock().getFullYear()
    const wines = await this.wines.list(input.householdId)
    const counts = countBottlesByWine(await this.bottles.listInStock(input.householdId))

    const items = wines
      .filter((wine) => (counts.get(wine.id) ?? 0) > 0)
      .map((wine) => ({
        wine: toWineView(wine, counts.get(wine.id) ?? 0),
        status: computeApogeeStatus(wine.gardeMin, wine.gardeMax, refYear),
      }))
      .sort((a, b) => a.wine.name.localeCompare(b.wine.name, 'fr'))

    return { refYear, wines: items }
  }
}
