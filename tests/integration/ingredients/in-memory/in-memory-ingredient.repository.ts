import type { Ingredient } from '../../../../server/contexts/ingredients/domain/entities/ingredient.entity'
import type {
  IIngredientRepository,
  ListIngredientsFilter,
} from '../../../../server/contexts/ingredients/domain/ports/ingredient-repository.port'

interface ReferenceSource {
  /** Returns true if the ingredient is referenced by at least one row of this source. */
  isReferenced(ingredientId: string, householdId: string): boolean
}

export class InMemoryIngredientRepository implements IIngredientRepository {
  private readonly store = new Map<string, Ingredient>()
  /** Test harness can register reference sources (inventory/recipes/shopping) to simulate isReferenced. */
  readonly referenceSources: ReferenceSource[] = []

  async findById(id: string, householdId: string): Promise<Ingredient | null> {
    const ing = this.store.get(id)
    return ing && ing.householdId === householdId ? ing : null
  }

  async findActiveByNameInHousehold(name: string, householdId: string): Promise<Ingredient | null> {
    const target = name.trim().toLowerCase()
    for (const ing of this.store.values()) {
      if (
        ing.householdId === householdId
        && ing.deletedAt === null
        && ing.name.toLowerCase() === target
      ) {
        return ing
      }
    }
    return null
  }

  async listForHousehold(
    householdId: string,
    filter: ListIngredientsFilter = {},
  ): Promise<Ingredient[]> {
    const q = filter.q?.trim().toLowerCase()
    return Array.from(this.store.values())
      .filter((ing) => {
        if (ing.householdId !== householdId) return false
        if (!filter.includeArchived && ing.deletedAt !== null) return false
        if (filter.storage && ing.storage !== filter.storage) return false
        if (filter.category && ing.category.value !== filter.category) return false
        if (q) {
          const name = ing.name.toLowerCase()
          const aliasHit = ing.aliases.some((a) => a.toLowerCase().includes(q))
          if (!name.includes(q) && !aliasHit) return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.category.value !== b.category.value) return a.category.sortOrder - b.category.sortOrder
        return a.name.localeCompare(b.name)
      })
  }

  async save(ingredient: Ingredient): Promise<void> {
    this.store.set(ingredient.id, ingredient)
  }

  async isReferenced(id: string, householdId: string): Promise<boolean> {
    return this.referenceSources.some((src) => src.isReferenced(id, householdId))
  }

  async hardDelete(id: string, householdId: string): Promise<void> {
    const ing = this.store.get(id)
    if (ing && ing.householdId === householdId) {
      this.store.delete(id)
    }
  }

  // Test helpers
  seed(ingredient: Ingredient): void {
    this.store.set(ingredient.id, ingredient)
  }

  size(): number {
    return this.store.size
  }

  forHousehold(householdId: string): Ingredient[] {
    return Array.from(this.store.values()).filter((i) => i.householdId === householdId)
  }
}
