import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { wines } from '../../../../database/schema/wine-cellar'
import type { Wine } from '../../domain/entities/wine.entity'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { WineMapper } from '../mappers/wine.mapper'

export class DrizzleWineRepository implements IWineRepository {
  constructor(private readonly db: Database) {}

  async create(wine: Wine): Promise<void> {
    await this.db.insert(wines).values(WineMapper.toPersistence(wine))
  }

  async findById(id: string, householdId: string): Promise<Wine | null> {
    const rows = await this.db
      .select()
      .from(wines)
      .where(and(eq(wines.id, id), eq(wines.householdId, householdId)))
      .limit(1)
    return rows[0] ? WineMapper.toDomain(rows[0]) : null
  }

  async list(householdId: string): Promise<Wine[]> {
    const rows = await this.db
      .select()
      .from(wines)
      .where(eq(wines.householdId, householdId))
      .orderBy(asc(wines.name))
    return rows.map(WineMapper.toDomain)
  }

  async update(wine: Wine): Promise<void> {
    const row = WineMapper.toPersistence(wine)
    await this.db
      .update(wines)
      .set({
        name: row.name,
        domain: row.domain,
        country: row.country,
        region: row.region,
        appellation: row.appellation,
        vintage: row.vintage,
        color: row.color,
        gardeMin: row.gardeMin,
        gardeMax: row.gardeMax,
        comment: row.comment,
        photoUrl: row.photoUrl,
        rating: row.rating,
        updatedAt: row.updatedAt,
      })
      .where(and(eq(wines.id, row.id), eq(wines.householdId, row.householdId)))
  }
}
