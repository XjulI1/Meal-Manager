import { and, asc, eq, isNull, like, sql } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { ingredientAliases, ingredients } from '../../../../database/schema/ingredients'
import { inventoryItems } from '../../../../database/schema/inventory-items'
import { recipeIngredients } from '../../../../database/schema/recipes'
import { shoppingListItems } from '../../../../database/schema/shopping-lists'
import type { Ingredient } from '../../domain/entities/ingredient.entity'
import type {
  IIngredientRepository,
  ListIngredientsFilter,
} from '../../domain/ports/ingredient-repository.port'
import { IngredientMapper } from '../mappers/ingredient.mapper'

export class DrizzleIngredientRepository implements IIngredientRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, householdId: string): Promise<Ingredient | null> {
    const rows = await this.db
      .select()
      .from(ingredients)
      .where(and(eq(ingredients.id, id), eq(ingredients.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    const aliases = await this.loadAliases([row.id])
    return IngredientMapper.toDomain(row, aliases.get(row.id) ?? [])
  }

  async findActiveByNameInHousehold(name: string, householdId: string): Promise<Ingredient | null> {
    const rows = await this.db
      .select()
      .from(ingredients)
      .where(
        and(
          eq(ingredients.householdId, householdId),
          isNull(ingredients.deletedAt),
          sql`LOWER(${ingredients.name}) = LOWER(${name.trim()})`,
        ),
      )
      .limit(1)
    const row = rows[0]
    if (!row) return null
    const aliases = await this.loadAliases([row.id])
    return IngredientMapper.toDomain(row, aliases.get(row.id) ?? [])
  }

  async listForHousehold(
    householdId: string,
    filter: ListIngredientsFilter = {},
  ): Promise<Ingredient[]> {
    const conditions = [eq(ingredients.householdId, householdId)]
    if (!filter.includeArchived) {
      conditions.push(isNull(ingredients.deletedAt))
    }
    if (filter.storage) {
      conditions.push(eq(ingredients.storage, filter.storage))
    }
    if (filter.category) {
      conditions.push(eq(ingredients.category, filter.category))
    }

    let rows = await this.db
      .select()
      .from(ingredients)
      .where(and(...conditions))
      .orderBy(asc(ingredients.category), asc(ingredients.name))

    if (filter.q) {
      const q = filter.q.trim().toLowerCase()
      const ids = rows.map((r) => r.id)
      const matchedByAlias = ids.length > 0
        ? new Set(
            (await this.db
              .select({ ingredientId: ingredientAliases.ingredientId })
              .from(ingredientAliases)
              .where(
                and(
                  sql`${ingredientAliases.ingredientId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`,
                  like(sql`LOWER(${ingredientAliases.alias})`, `%${q}%`),
                ),
              )).map((a) => a.ingredientId),
          )
        : new Set<string>()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || matchedByAlias.has(r.id))
    }

    if (rows.length === 0) return []
    const aliasesById = await this.loadAliases(rows.map((r) => r.id))
    return rows.map((r) => IngredientMapper.toDomain(r, aliasesById.get(r.id) ?? []))
  }

  async save(ingredient: Ingredient): Promise<void> {
    const row = IngredientMapper.toPersistence(ingredient)
    await this.db.transaction(async (tx) => {
      await tx
        .insert(ingredients)
        .values(row)
        .onDuplicateKeyUpdate({
          set: {
            name: row.name,
            storage: row.storage,
            category: row.category,
            canonicalUnit: row.canonicalUnit,
            shelfLifeDays: row.shelfLifeDays ?? null,
            imageUrl: row.imageUrl ?? null,
            defaultPackSize: row.defaultPackSize ?? null,
            allergens: row.allergens ?? null,
            deletedAt: row.deletedAt ?? null,
            updatedAt: row.updatedAt,
          },
        })

      // Atomically replace the alias list
      await tx.delete(ingredientAliases).where(eq(ingredientAliases.ingredientId, ingredient.id))
      if (ingredient.aliases.length > 0) {
        await tx.insert(ingredientAliases).values(
          ingredient.aliases.map((alias) => ({
            ingredientId: ingredient.id,
            alias,
          })),
        )
      }
    })
  }

  async isReferenced(id: string, householdId: string): Promise<boolean> {
    const [inv, rec, sli] = await Promise.all([
      this.db
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(and(eq(inventoryItems.ingredientId, id), eq(inventoryItems.householdId, householdId)))
        .limit(1),
      this.db
        .select({ id: recipeIngredients.recipeId })
        .from(recipeIngredients)
        .where(eq(recipeIngredients.ingredientId, id))
        .limit(1),
      this.db
        .select({ id: shoppingListItems.id })
        .from(shoppingListItems)
        .where(eq(shoppingListItems.ingredientId, id))
        .limit(1),
    ])
    return inv.length > 0 || rec.length > 0 || sli.length > 0
  }

  async hardDelete(id: string, householdId: string): Promise<void> {
    await this.db
      .delete(ingredients)
      .where(and(eq(ingredients.id, id), eq(ingredients.householdId, householdId)))
  }

  private async loadAliases(ingredientIds: string[]): Promise<Map<string, string[]>> {
    if (ingredientIds.length === 0) return new Map()
    const rows = await this.db
      .select()
      .from(ingredientAliases)
      .where(
        sql`${ingredientAliases.ingredientId} IN (${sql.join(ingredientIds.map((id) => sql`${id}`), sql`, `)})`,
      )
    const map = new Map<string, string[]>()
    for (const r of rows) {
      const list = map.get(r.ingredientId) ?? []
      list.push(r.alias)
      map.set(r.ingredientId, list)
    }
    return map
  }
}
