import { MenuNotFoundError } from '../../domain/errors/menu-not-found.error'
import type { IMenuRepository } from '../../domain/ports/menu-repository.port'
import { DayOfWeek } from '../../domain/value-objects/day-of-week.vo'
import { MealType } from '../../domain/value-objects/meal-type.vo'

export interface ClearSlotInput {
  householdId: string
  menuId: string
  dayOfWeek: string
  mealType: string
}

export class ClearSlotUseCase {
  constructor(
    private readonly menus: IMenuRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: ClearSlotInput): Promise<void> {
    const menu = await this.menus.findById(input.menuId, input.householdId)
    if (!menu) {
      throw new MenuNotFoundError(input.menuId)
    }
    await this.menus.removeSlot(
      menu.id,
      DayOfWeek.fromString(input.dayOfWeek),
      MealType.fromString(input.mealType),
      this.clock(),
    )
  }
}
