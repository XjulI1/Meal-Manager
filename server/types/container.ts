import type { CreateRecipeUseCase } from '../contexts/catalog/application/use-cases/create-recipe.use-case'
import type { DeleteRecipeUseCase } from '../contexts/catalog/application/use-cases/delete-recipe.use-case'
import type { GetRecipeByIdUseCase } from '../contexts/catalog/application/use-cases/get-recipe-by-id.use-case'
import type { ListRecipesUseCase } from '../contexts/catalog/application/use-cases/list-recipes.use-case'
import type { UpdateRecipeUseCase } from '../contexts/catalog/application/use-cases/update-recipe.use-case'
import type { CreateHouseholdUseCase } from '../contexts/family/application/use-cases/create-household.use-case'
import type { GetCurrentHouseholdUseCase } from '../contexts/family/application/use-cases/get-current-household.use-case'
import type { JoinHouseholdUseCase } from '../contexts/family/application/use-cases/join-household.use-case'
import type { LeaveHouseholdUseCase } from '../contexts/family/application/use-cases/leave-household.use-case'
import type { AddProductUseCase } from '../contexts/ingredients/application/use-cases/add-product.use-case'
import type { CreateIngredientUseCase } from '../contexts/ingredients/application/use-cases/create-ingredient.use-case'
import type { DeleteIngredientUseCase } from '../contexts/ingredients/application/use-cases/delete-ingredient.use-case'
import type { GetIngredientUseCase } from '../contexts/ingredients/application/use-cases/get-ingredient.use-case'
import type { GetProductUseCase } from '../contexts/ingredients/application/use-cases/get-product.use-case'
import type { ListIngredientsUseCase } from '../contexts/ingredients/application/use-cases/list-ingredients.use-case'
import type { RemoveProductUseCase } from '../contexts/ingredients/application/use-cases/remove-product.use-case'
import type { ResolveByBarcodeUseCase } from '../contexts/ingredients/application/use-cases/resolve-by-barcode.use-case'
import type { UpdateIngredientUseCase } from '../contexts/ingredients/application/use-cases/update-ingredient.use-case'
import type { UpdateProductUseCase } from '../contexts/ingredients/application/use-cases/update-product.use-case'
import type { IBarcodeResolver } from '../contexts/inventory/domain/ports/barcode-resolver'
import type { AssignRecipeToSlotUseCase } from '../contexts/meal-planning/application/use-cases/assign-recipe-to-slot.use-case'
import type { ClearSlotUseCase } from '../contexts/meal-planning/application/use-cases/clear-slot.use-case'
import type { CreateMenuUseCase } from '../contexts/meal-planning/application/use-cases/create-menu.use-case'
import type { GetMenuByWeekUseCase } from '../contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import type { AddInventoryItemUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item.use-case'
import type { AdjustQuantityUseCase } from '../contexts/inventory/application/use-cases/adjust-quantity.use-case'
import type { ListInventoryItemsUseCase } from '../contexts/inventory/application/use-cases/list-inventory-items.use-case'
import type { RemoveInventoryItemUseCase } from '../contexts/inventory/application/use-cases/remove-inventory-item.use-case'
import type { UpdateInventoryItemUseCase } from '../contexts/inventory/application/use-cases/update-inventory-item.use-case'
import type { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import type { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'
import type { GenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import type { GetShoppingListByMenuUseCase } from '../contexts/shopping/application/use-cases/get-shopping-list-by-menu.use-case'
import type { RegenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/regenerate-shopping-list.use-case'
import type { ToggleShoppingListItemUseCase } from '../contexts/shopping/application/use-cases/toggle-shopping-list-item.use-case'

export interface Container {
  // platform
  registerUser: RegisterUserUseCase
  loginUser: LoginUserUseCase
  // family
  createHousehold: CreateHouseholdUseCase
  joinHousehold: JoinHouseholdUseCase
  leaveHousehold: LeaveHouseholdUseCase
  getCurrentHousehold: GetCurrentHouseholdUseCase
  // ingredients
  createIngredient: CreateIngredientUseCase
  updateIngredient: UpdateIngredientUseCase
  deleteIngredient: DeleteIngredientUseCase
  listIngredients: ListIngredientsUseCase
  getIngredient: GetIngredientUseCase
  addProduct: AddProductUseCase
  getProduct: GetProductUseCase
  updateProduct: UpdateProductUseCase
  removeProduct: RemoveProductUseCase
  resolveByBarcode: ResolveByBarcodeUseCase
  /** Implements the inventory IBarcodeResolver port, bound to the in-household catalog. */
  barcodeResolver: IBarcodeResolver
  // inventory
  addInventoryItem: AddInventoryItemUseCase
  updateInventoryItem: UpdateInventoryItemUseCase
  removeInventoryItem: RemoveInventoryItemUseCase
  listInventoryItems: ListInventoryItemsUseCase
  adjustInventoryQuantity: AdjustQuantityUseCase
  // catalog
  createRecipe: CreateRecipeUseCase
  updateRecipe: UpdateRecipeUseCase
  deleteRecipe: DeleteRecipeUseCase
  listRecipes: ListRecipesUseCase
  getRecipeById: GetRecipeByIdUseCase
  // meal-planning
  createMenu: CreateMenuUseCase
  getMenuByWeek: GetMenuByWeekUseCase
  assignRecipeToSlot: AssignRecipeToSlotUseCase
  clearSlot: ClearSlotUseCase
  // shopping
  generateShoppingList: GenerateShoppingListUseCase
  regenerateShoppingList: RegenerateShoppingListUseCase
  getShoppingListByMenu: GetShoppingListByMenuUseCase
  toggleShoppingListItem: ToggleShoppingListItemUseCase
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
