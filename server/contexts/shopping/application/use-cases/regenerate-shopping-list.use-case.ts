import type { GenerateShoppingListUseCase, ShoppingListView } from './generate-shopping-list.use-case'

export interface RegenerateShoppingListInput {
  householdId: string
  menuId: string
}

/**
 * Thin wrapper around {@link GenerateShoppingListUseCase} that always
 * replaces the existing snapshot. Kept separate to match the task list
 * (task 10.7) and to make the call site explicit.
 */
export class RegenerateShoppingListUseCase {
  constructor(private readonly generate: GenerateShoppingListUseCase) {}

  async execute(input: RegenerateShoppingListInput): Promise<ShoppingListView> {
    return this.generate.execute({ ...input, reuse: false })
  }
}
