import type { WineView } from '../../../../../shared/dto/wine-cellar'
import type { WineAttributes } from '../../domain/entities/wine.entity'
import { WineNotFoundError } from '../../domain/errors/wine-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineEnricher } from '../../domain/ports/wine-enricher.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
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

    // Only overwrite a field the research actually returned (`?? existing`).
    const gardeMin = result.gardeMin ?? wine.gardeMin
    const gardeMax = result.gardeMax ?? wine.gardeMax
    const gardeCoherent = gardeMin === null || gardeMax === null || gardeMin <= gardeMax

    const now = this.clock()
    const attributes: WineAttributes = {
      name: wine.name,
      domain: wine.domain,
      country: wine.country,
      region: wine.region,
      appellation: wine.appellation,
      vintage: wine.vintage,
      color: wine.color,
      gardeMin: gardeCoherent ? gardeMin : wine.gardeMin,
      gardeMax: gardeCoherent ? gardeMax : wine.gardeMax,
      comment: wine.comment,
      aromas: result.aromas ?? wine.aromas,
      foodPairings: result.foodPairings ?? wine.foodPairings,
      aiEnrichedAt: now,
      photoUrl: wine.photoUrl,
      rating: wine.rating,
    }
    const updated = wine.withAttributes(attributes, now)
    await this.wines.update(updated)

    const bottleCount = (await this.bottles.listByWine(wine.id, input.householdId)).length
    return toWineView(updated, bottleCount)
  }
}
