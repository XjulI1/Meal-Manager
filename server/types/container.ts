import type { CreateHouseholdUseCase } from '../contexts/family/application/use-cases/create-household.use-case'
import type { GetCurrentHouseholdUseCase } from '../contexts/family/application/use-cases/get-current-household.use-case'
import type { JoinHouseholdUseCase } from '../contexts/family/application/use-cases/join-household.use-case'
import type { LeaveHouseholdUseCase } from '../contexts/family/application/use-cases/leave-household.use-case'
import type { AddInventoryItemUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item.use-case'
import type { AdjustQuantityUseCase } from '../contexts/inventory/application/use-cases/adjust-quantity.use-case'
import type { ListInventoryItemsUseCase } from '../contexts/inventory/application/use-cases/list-inventory-items.use-case'
import type { RemoveInventoryItemUseCase } from '../contexts/inventory/application/use-cases/remove-inventory-item.use-case'
import type { UpdateInventoryItemUseCase } from '../contexts/inventory/application/use-cases/update-inventory-item.use-case'
import type { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import type { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'

export interface Container {
  // platform
  registerUser: RegisterUserUseCase
  loginUser: LoginUserUseCase
  // family
  createHousehold: CreateHouseholdUseCase
  joinHousehold: JoinHouseholdUseCase
  leaveHousehold: LeaveHouseholdUseCase
  getCurrentHousehold: GetCurrentHouseholdUseCase
  // inventory
  addInventoryItem: AddInventoryItemUseCase
  updateInventoryItem: UpdateInventoryItemUseCase
  removeInventoryItem: RemoveInventoryItemUseCase
  listInventoryItems: ListInventoryItemsUseCase
  adjustInventoryQuantity: AdjustQuantityUseCase
}

declare module 'h3' {
  interface H3EventContext {
    container: Container
    user?: { id: string, email: string }
  }
}

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
  }
}

export {}
