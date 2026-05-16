import type { IHouseholdInitializer } from '../../family/domain/ports/household-initializer.port'
import type { SeedDefaultIngredientsUseCase } from '../application/use-cases/seed-default-ingredients.use-case'

/**
 * Plugs the ingredient seed into `family/CreateHouseholdUseCase` through the
 * `IHouseholdInitializer` extension point. Registered in the composition root.
 */
export class SeedDefaultIngredientsInitializer implements IHouseholdInitializer {
  constructor(private readonly seedUseCase: SeedDefaultIngredientsUseCase) {}

  async initialize(householdId: string): Promise<void> {
    await this.seedUseCase.execute({ householdId })
  }
}
