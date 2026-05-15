import type { WeekStart } from '../value-objects/week-start.vo'
import type { MenuSlot } from './menu-slot.entity'

export interface MenuProps {
  id: string
  householdId: string
  weekStart: WeekStart
  slots: ReadonlyArray<MenuSlot>
  createdAt: Date
  updatedAt: Date
}

export class Menu {
  readonly id: string
  readonly householdId: string
  readonly weekStart: WeekStart
  readonly slots: ReadonlyArray<MenuSlot>
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: MenuProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.weekStart = props.weekStart
    this.slots = props.slots
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: { id: string, householdId: string, weekStart: WeekStart, now?: Date }): Menu {
    const now = props.now ?? new Date()
    return new Menu({
      id: props.id,
      householdId: props.householdId,
      weekStart: props.weekStart,
      slots: [],
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: MenuProps): Menu {
    return new Menu(props)
  }
}
