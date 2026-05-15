import { useDb } from '../database/client'
import { CreateRecipeUseCase } from '../contexts/catalog/application/use-cases/create-recipe.use-case'
import { DeleteRecipeUseCase } from '../contexts/catalog/application/use-cases/delete-recipe.use-case'
import { GetRecipeByIdUseCase } from '../contexts/catalog/application/use-cases/get-recipe-by-id.use-case'
import { ListRecipesUseCase } from '../contexts/catalog/application/use-cases/list-recipes.use-case'
import { UpdateRecipeUseCase } from '../contexts/catalog/application/use-cases/update-recipe.use-case'
import { DrizzleRecipeRepository } from '../contexts/catalog/infrastructure/repositories/drizzle-recipe.repository'
import { CreateHouseholdUseCase } from '../contexts/family/application/use-cases/create-household.use-case'
import { GetCurrentHouseholdUseCase } from '../contexts/family/application/use-cases/get-current-household.use-case'
import { JoinHouseholdUseCase } from '../contexts/family/application/use-cases/join-household.use-case'
import { LeaveHouseholdUseCase } from '../contexts/family/application/use-cases/leave-household.use-case'
import { CryptoInviteCodeGenerator } from '../contexts/family/infrastructure/crypto-invite-code-generator'
import { DrizzleHouseholdRepository } from '../contexts/family/infrastructure/repositories/drizzle-household.repository'
import { AddInventoryItemUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { AdjustQuantityUseCase } from '../contexts/inventory/application/use-cases/adjust-quantity.use-case'
import { ListInventoryItemsUseCase } from '../contexts/inventory/application/use-cases/list-inventory-items.use-case'
import { RemoveInventoryItemUseCase } from '../contexts/inventory/application/use-cases/remove-inventory-item.use-case'
import { UpdateInventoryItemUseCase } from '../contexts/inventory/application/use-cases/update-inventory-item.use-case'
import { DrizzleInventoryItemRepository } from '../contexts/inventory/infrastructure/repositories/drizzle-inventory-item.repository'
import { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'
import { Argon2PasswordHasher } from '../contexts/platform/infrastructure/hashers/argon2-password-hasher'
import { DrizzleUserRepository } from '../contexts/platform/infrastructure/repositories/drizzle-user.repository'
import type { Container } from '../types/container'

export default defineNitroPlugin((nitro) => {
  let containerInstance: Container | null = null

  nitro.hooks.hook('request', (event) => {
    if (!containerInstance) {
      containerInstance = buildContainer()
    }
    event.context.container = containerInstance
  })
})

function buildContainer(): Container {
  const db = useDb()

  // platform
  const userRepo = new DrizzleUserRepository(db)
  const hasher = new Argon2PasswordHasher()

  // family
  const householdRepo = new DrizzleHouseholdRepository(db)
  const inviteCodes = new CryptoInviteCodeGenerator()

  // inventory
  const inventoryRepo = new DrizzleInventoryItemRepository(db)

  // catalog
  const recipeRepo = new DrizzleRecipeRepository(db)

  return {
    registerUser: new RegisterUserUseCase(userRepo, hasher),
    loginUser: new LoginUserUseCase(userRepo, hasher),
    createHousehold: new CreateHouseholdUseCase(householdRepo, inviteCodes),
    joinHousehold: new JoinHouseholdUseCase(householdRepo),
    leaveHousehold: new LeaveHouseholdUseCase(householdRepo),
    getCurrentHousehold: new GetCurrentHouseholdUseCase(householdRepo),
    addInventoryItem: new AddInventoryItemUseCase(inventoryRepo),
    updateInventoryItem: new UpdateInventoryItemUseCase(inventoryRepo),
    removeInventoryItem: new RemoveInventoryItemUseCase(inventoryRepo),
    listInventoryItems: new ListInventoryItemsUseCase(inventoryRepo),
    adjustInventoryQuantity: new AdjustQuantityUseCase(inventoryRepo),
    createRecipe: new CreateRecipeUseCase(recipeRepo),
    updateRecipe: new UpdateRecipeUseCase(recipeRepo),
    deleteRecipe: new DeleteRecipeUseCase(recipeRepo),
    listRecipes: new ListRecipesUseCase(recipeRepo),
    getRecipeById: new GetRecipeByIdUseCase(recipeRepo),
  }
}
