import { randomUUID } from 'node:crypto'
import { Menu } from '../../domain/entities/menu.entity'
import type { IMenuRepository } from '../../domain/ports/menu-repository.port'
import { WeekStart } from '../../domain/value-objects/week-start.vo'
import { toMenuView, type MenuView } from './create-menu.use-case'

export interface GetMenuByWeekInput {
  householdId: string
  weekStart: string
}

export class GetMenuByWeekUseCase {
  constructor(
    private readonly menus: IMenuRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: GetMenuByWeekInput): Promise<MenuView> {
    const weekStart = WeekStart.fromIsoDate(input.weekStart)
    const existing = await this.menus.findByWeek(input.householdId, weekStart)
    if (existing) {
      return toMenuView(existing)
    }

    // Lazy creation — the spec mandates this so the client doesn't deal with a
    // 404 + create flow when navigating to a new week.
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
