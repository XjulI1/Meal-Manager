import type { Wine, WineAttributes } from '../domain/entities/wine.entity'
import type { WineEnrichmentResult } from '../domain/ports/wine-enricher.port'

/**
 * Applies an enrichment result to a wine and returns the updated entity, with
 * the rules shared by BOTH enrichment paths (in-app AI research and
 * externally-supplied values, e.g. via MCP):
 *  - a field the result omits leaves the existing value unchanged (`?? existing`);
 *  - an incoherent garde window (`gardeMin > gardeMax`) is neutralized — the
 *    existing window is kept — so the domain invariant never fails on the input;
 *  - `aiEnrichedAt` is stamped to `now`.
 */
export function applyWineEnrichment(wine: Wine, result: WineEnrichmentResult, now: Date): Wine {
  const gardeMin = result.gardeMin ?? wine.gardeMin
  const gardeMax = result.gardeMax ?? wine.gardeMax
  const gardeCoherent = gardeMin === null || gardeMax === null || gardeMin <= gardeMax

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
  return wine.withAttributes(attributes, now)
}
