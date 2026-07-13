import type { Wine, WineAttributes } from '../domain/entities/wine.entity'
import { WineColor } from '../domain/value-objects/wine-color.vo'
import { WineRegion } from '../domain/value-objects/wine-region.vo'

/** Primitive wine fields as received from the transport layer. */
export interface WineInput {
  name: string
  domain?: string
  country?: string
  region?: string
  appellation?: string
  vintage?: number
  color: string
  gardeMin?: number
  gardeMax?: number
  comment?: string
  photoUrl?: string
  rating?: number
}

export type WinePatch = Partial<WineInput>

/** Builds a full set of attributes for a new wine (country defaults to France). */
export function createWineAttributes(input: WineInput): WineAttributes {
  return {
    name: input.name,
    domain: input.domain ?? null,
    country: input.country ?? 'France',
    region: input.region ? WineRegion.fromString(input.region) : null,
    appellation: input.appellation ?? null,
    vintage: input.vintage ?? null,
    color: WineColor.fromString(input.color),
    gardeMin: input.gardeMin ?? null,
    gardeMax: input.gardeMax ?? null,
    comment: input.comment ?? null,
    photoUrl: input.photoUrl ?? null,
    rating: input.rating ?? null,
  }
}

/** Merges a partial patch onto an existing wine (undefined = unchanged). */
export function mergeWineAttributes(wine: Wine, patch: WinePatch): WineAttributes {
  return {
    name: patch.name ?? wine.name,
    domain: patch.domain !== undefined ? patch.domain : wine.domain,
    country: patch.country !== undefined ? patch.country : wine.country,
    region: patch.region !== undefined ? WineRegion.fromString(patch.region) : wine.region,
    appellation: patch.appellation !== undefined ? patch.appellation : wine.appellation,
    vintage: patch.vintage !== undefined ? patch.vintage : wine.vintage,
    color: patch.color !== undefined ? WineColor.fromString(patch.color) : wine.color,
    gardeMin: patch.gardeMin !== undefined ? patch.gardeMin : wine.gardeMin,
    gardeMax: patch.gardeMax !== undefined ? patch.gardeMax : wine.gardeMax,
    comment: patch.comment !== undefined ? patch.comment : wine.comment,
    photoUrl: patch.photoUrl !== undefined ? patch.photoUrl : wine.photoUrl,
    rating: patch.rating !== undefined ? patch.rating : wine.rating,
  }
}
