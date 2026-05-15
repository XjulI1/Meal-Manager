import { randomUUID } from 'node:crypto'
import { Menu } from '../../domain/entities/menu.entity'
import type { IMenuRepository } from '../../domain/ports/menu-repository.port'
import { WeekStart } from '../../domain/value-objects/week-start.vo'

export interface CreateMenuInput {
  householdId: string
  weekStart: string
}

export interface MenuView {
  id: string
  weekStart: string
  slots: Array<{
    dayOfWeek: string
    mealType: string
    recipeId: string
    servings: number
  }>
}

export class CreateMenuUseCase {
  constructor(
    private readonly menus: IMenuRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateMenuInput): Promise<MenuView> {
    const weekStart = WeekStart.fromIsoDate(input.weekStart)
    const existing = await this.menus.findByWeek(input.householdId, weekStart)
    if (existing) {
      return toMenuView(existing)
    }

    const menu = Menu.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      weekStart,
      now: this.clock(),
    })
    await this.menus.create(menu)
    return toMenuView(menu)
  }
}

export function toMenuView(menu: Menu): MenuView {
  return {
    id: menu.id,
    weekStart: menu.weekStart.toIsoDate(),
    slots: menu.slots.map((s) => ({
      dayOfWeek: s.dayOfWeek.value,
      mealType: s.mealType.value,
      recipeId: s.recipeId,
      servings: s.servings,
    })),
  }
}
