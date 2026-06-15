import { and, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import {
  recipeDraftIngredients,
  recipeDrafts,
} from '../../../../database/schema/recipe-drafts'
import type { RecipeDraft } from '../../domain/entities/recipe-draft.entity'
import type {
  IRecipeDraftRepository,
  RecipeDraftSummary,
} from '../../domain/ports/recipe-draft-repository.port'
import { RecipeDraftMapper } from '../mappers/recipe-draft.mapper'

export class DrizzleRecipeDraftRepository implements IRecipeDraftRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, householdId: string): Promise<RecipeDraft | null> {
    const rows = await this.db
      .select()
      .from(recipeDrafts)
      .where(and(eq(recipeDrafts.id, id), eq(recipeDrafts.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null

    const ingredientRows = await this.db
      .select()
      .from(recipeDraftIngredients)
      .where(eq(recipeDraftIngredients.draftId, row.id))

    return RecipeDraftMapper.toDomain(row, ingredientRows)
  }

  async listForHousehold(householdId: string): Promise<RecipeDraftSummary[]> {
    const rows = await this.db
      .select({
        id: recipeDrafts.id,
        title: recipeDrafts.title,
        source: recipeDrafts.source,
        updatedAt: recipeDrafts.updatedAt,
      })
      .from(recipeDrafts)
      .where(eq(recipeDrafts.householdId, householdId))
      .orderBy(desc(recipeDrafts.updatedAt))

    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? null,
      source: r.source,
      updatedAt: r.updatedAt,
    }))
  }

  async countForHousehold(householdId: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(recipeDrafts)
      .where(eq(recipeDrafts.householdId, householdId))
    return Number(rows[0]?.count ?? 0)
  }

  async create(draft: RecipeDraft): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(recipeDrafts).values(RecipeDraftMapper.toPersistence(draft))
      const ingredientRows = RecipeDraftMapper.ingredientsToPersistence(draft)
      if (ingredientRows.length > 0) {
        await tx.insert(recipeDraftIngredients).values(ingredientRows)
      }
    })
  }

  async update(draft: RecipeDraft): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(recipeDrafts)
        .set({
          title: draft.title ?? null,
          instructions: draft.instructions ?? null,
          servings: draft.servings ?? null,
          sourceUrl: draft.sourceUrl ?? null,
          updatedAt: draft.updatedAt,
        })
        .where(and(eq(recipeDrafts.id, draft.id), eq(recipeDrafts.householdId, draft.householdId)))

      await tx.delete(recipeDraftIngredients).where(eq(recipeDraftIngredients.draftId, draft.id))
      const ingredientRows = RecipeDraftMapper.ingredientsToPersistence(draft)
      if (ingredientRows.length > 0) {
        await tx.insert(recipeDraftIngredients).values(ingredientRows)
      }
    })
  }

  async delete(id: string, householdId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(recipeDraftIngredients).where(eq(recipeDraftIngredients.draftId, id))
      await tx
        .delete(recipeDrafts)
        .where(and(eq(recipeDrafts.id, id), eq(recipeDrafts.householdId, householdId)))
    })
  }
}
