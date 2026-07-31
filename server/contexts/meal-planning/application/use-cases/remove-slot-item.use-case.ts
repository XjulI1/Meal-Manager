import { MenuNotFoundError } from '../../domain/errors/menu-not-found.error'
import { SlotItemNotFoundError } from '../../domain/errors/slot-item-not-found.error'
import type { IMenuRepository } from '../../domain/ports/menu-repository.port'

export interface RemoveSlotItemInput {
  householdId: string
  menuId: string
  itemId: string
}

export class RemoveSlotItemUseCase {
  constructor(
    private readonly menus: IMenuRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: RemoveSlotItemInput): Promise<void> {
    const menu = await this.menus.findById(input.menuId, input.householdId)
    if (!menu) {
      throw new MenuNotFoundError(input.menuId)
    }

    const item = menu.slots.flatMap((s) => s.items).find((i) => i.id === input.itemId)
    if (!item) {
      throw new SlotItemNotFoundError(input.itemId)
    }

    await this.menus.removeSlotItem(menu.id, input.itemId, this.clock())
  }
}
