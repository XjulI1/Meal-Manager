/**
 * Port for on-demand AI enrichment of a wine reference. Given what is already
 * known about a cuvée, the adapter researches its garde window (apogée years),
 * aromatic profile and food pairings. The v1 implementation uses the Anthropic
 * API with web search.
 *
 * Every field of the result is optional: a value the research cannot establish
 * reliably MUST be omitted (never invented) so the use case leaves the existing
 * value unchanged. `gardeMin`/`gardeMax` are absolute apogée years.
 */
export interface WineFacts {
  name: string
  domain: string | null
  country: string | null
  region: string | null
  appellation: string | null
  vintage: number | null
  color: string
}

export interface WineEnrichmentResult {
  gardeMin?: number
  gardeMax?: number
  aromas?: string
  foodPairings?: string
}

export interface IWineEnricher {
  enrich(facts: WineFacts): Promise<WineEnrichmentResult>
}
