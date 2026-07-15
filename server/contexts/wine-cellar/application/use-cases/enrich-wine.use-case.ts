import type { WineView } from '../../../../../shared/dto/wine-cellar'
import { WineNotFoundError } from '../../domain/errors/wine-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineEnricher } from '../../domain/ports/wine-enricher.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { applyWineEnrichment } from '../apply-wine-enrichment'
import { toWineView } from '../wine-cellar-views'

export interface EnrichWineInput {
  householdId: string
  id: string
}

/**
 * On-demand AI enrichment of a wine: researches its garde window, aromatic
 * profile and food pairings, then persists the result on the wine and stamps
 * `aiEnrichedAt`. A field the research does not return is left unchanged.
 *
 * An incoherent garde window from the research (gardeMin > gardeMax) is
 * neutralized here (the existing window is kept) so the domain invariant never
 * fails on AI output — the rest of the enrichment still applies.
 */
export class EnrichWineUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
    private readonly enricher: IWineEnricher,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: EnrichWineInput): Promise<WineView> {
    const wine = await this.wines.findById(input.id, input.householdId)
    if (!wine) throw new WineNotFoundError(input.id)

    const result = await this.enricher.enrich({
      name: wine.name,
      domain: wine.domain,
      country: wine.country,
      region: wine.region ? wine.region.value : null,
      appellation: wine.appellation,
      vintage: wine.vintage,
      color: wine.color.value,
    })

    const updated = applyWineEnrichment(wine, result, this.clock())
    await this.wines.update(updated)

    const bottleCount = (await this.bottles.listByWine(wine.id, input.householdId)).length
    return toWineView(updated, bottleCount)
  }
}
