import type {
  IWineEnricher,
  WineEnrichmentResult,
  WineFacts,
} from '../../../../server/contexts/wine-cellar/domain/ports/wine-enricher.port'

/** In-memory fake enricher: returns a fixed result or throws a fixed error. */
export class FakeWineEnricher implements IWineEnricher {
  lastFacts?: WineFacts

  constructor(private readonly result: WineEnrichmentResult | Error) {}

  async enrich(facts: WineFacts): Promise<WineEnrichmentResult> {
    this.lastFacts = facts
    if (this.result instanceof Error) throw this.result
    return this.result
  }
}
