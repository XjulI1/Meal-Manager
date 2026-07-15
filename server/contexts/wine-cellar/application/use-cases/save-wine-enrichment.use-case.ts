import type { WineView } from '../../../../../shared/dto/wine-cellar'
import { WineNotFoundError } from '../../domain/errors/wine-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { WineEnrichmentResult } from '../../domain/ports/wine-enricher.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { applyWineEnrichment } from '../apply-wine-enrichment'
import { toWineView } from '../wine-cellar-views'

export interface SaveWineEnrichmentInput {
  householdId: string
  id: string
  enrichment: WineEnrichmentResult
}

/**
 * Persists enrichment values that were already obtained elsewhere (e.g.
 * researched by an LLM agent over MCP) — WITHOUT any server-side AI call. The
 * persistence rules are shared with the in-app path via `applyWineEnrichment`
 * (omitted field = unchanged, incoherent garde neutralized, `aiEnrichedAt`
 * stamped). Re-enrichment of an already-enriched wine is allowed.
 */
export class SaveWineEnrichmentUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: SaveWineEnrichmentInput): Promise<WineView> {
    const wine = await this.wines.findById(input.id, input.householdId)
    if (!wine) throw new WineNotFoundError(input.id)

    const updated = applyWineEnrichment(wine, input.enrichment, this.clock())
    await this.wines.update(updated)

    const bottleCount = (await this.bottles.listByWine(wine.id, input.householdId)).length
    return toWineView(updated, bottleCount)
  }
}
