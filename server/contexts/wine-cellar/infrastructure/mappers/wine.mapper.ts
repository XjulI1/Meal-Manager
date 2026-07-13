import type { NewWineRow, WineRow } from '../../../../database/schema/wine-cellar'
import { Wine } from '../../domain/entities/wine.entity'
import { WineColor } from '../../domain/value-objects/wine-color.vo'
import { WineRegion } from '../../domain/value-objects/wine-region.vo'

export const WineMapper = {
  toDomain(row: WineRow): Wine {
    return Wine.rehydrate({
      id: row.id,
      householdId: row.householdId,
      name: row.name,
      domain: row.domain,
      country: row.country,
      region: row.region ? WineRegion.fromString(row.region) : null,
      appellation: row.appellation,
      vintage: row.vintage,
      color: WineColor.fromString(row.color),
      gardeMin: row.gardeMin,
      gardeMax: row.gardeMax,
      comment: row.comment,
      photoUrl: row.photoUrl,
      rating: row.rating,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(wine: Wine): NewWineRow {
    return {
      id: wine.id,
      householdId: wine.householdId,
      name: wine.name,
      domain: wine.domain,
      country: wine.country,
      region: wine.region ? wine.region.value : null,
      appellation: wine.appellation,
      vintage: wine.vintage,
      color: wine.color.value,
      gardeMin: wine.gardeMin,
      gardeMax: wine.gardeMax,
      comment: wine.comment,
      photoUrl: wine.photoUrl,
      rating: wine.rating,
      createdAt: wine.createdAt,
      updatedAt: wine.updatedAt,
    }
  },
}
