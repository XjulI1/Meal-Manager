import type { IRecipeFinder } from '../../../../server/contexts/meal-planning/domain/ports/recipe-finder.port'

export class FakeRecipeFinder implements IRecipeFinder {
  private readonly memberships = new Set<string>()

  register(recipeId: string, householdId: string): this {
    this.memberships.add(`${recipeId}|${householdId}`)
    return this
  }

  async existsInHousehold(recipeId: string, householdId: string): Promise<boolean> {
    return this.memberships.has(`${recipeId}|${householdId}`)
  }
}
