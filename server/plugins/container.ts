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
import { AddProductUseCase } from '../contexts/ingredients/application/use-cases/add-product.use-case'
import { CreateIngredientUseCase } from '../contexts/ingredients/application/use-cases/create-ingredient.use-case'
import { DeleteIngredientUseCase } from '../contexts/ingredients/application/use-cases/delete-ingredient.use-case'
import { GetIngredientUseCase } from '../contexts/ingredients/application/use-cases/get-ingredient.use-case'
import { ListIngredientsUseCase } from '../contexts/ingredients/application/use-cases/list-ingredients.use-case'
import { RemoveProductUseCase } from '../contexts/ingredients/application/use-cases/remove-product.use-case'
import { ResolveByBarcodeUseCase } from '../contexts/ingredients/application/use-cases/resolve-by-barcode.use-case'
import { SeedDefaultIngredientsUseCase } from '../contexts/ingredients/application/use-cases/seed-default-ingredients.use-case'
import { UpdateIngredientUseCase } from '../contexts/ingredients/application/use-cases/update-ingredient.use-case'
import { UpdateProductUseCase } from '../contexts/ingredients/application/use-cases/update-product.use-case'
import { IngredientBarcodeResolver } from '../contexts/ingredients/infrastructure/ingredient-barcode-resolver.adapter'
import { DrizzleIngredientRepository } from '../contexts/ingredients/infrastructure/repositories/drizzle-ingredient.repository'
import { DrizzleProductRepository } from '../contexts/ingredients/infrastructure/repositories/drizzle-product.repository'
import { SeedDefaultIngredientsInitializer } from '../contexts/ingredients/infrastructure/seed-default-ingredients.initializer'
import { AddInventoryItemUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { AdjustQuantityUseCase } from '../contexts/inventory/application/use-cases/adjust-quantity.use-case'
import { ListInventoryItemsUseCase } from '../contexts/inventory/application/use-cases/list-inventory-items.use-case'
import { RemoveInventoryItemUseCase } from '../contexts/inventory/application/use-cases/remove-inventory-item.use-case'
import { UpdateInventoryItemUseCase } from '../contexts/inventory/application/use-cases/update-inventory-item.use-case'
import { DrizzleInventoryItemRepository } from '../contexts/inventory/infrastructure/repositories/drizzle-inventory-item.repository'
import { AssignRecipeToSlotUseCase } from '../contexts/meal-planning/application/use-cases/assign-recipe-to-slot.use-case'
import { ClearSlotUseCase } from '../contexts/meal-planning/application/use-cases/clear-slot.use-case'
import { CreateMenuUseCase } from '../contexts/meal-planning/application/use-cases/create-menu.use-case'
import { GetMenuByWeekUseCase } from '../contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import { CatalogRecipeFinder } from '../contexts/meal-planning/infrastructure/adapters/recipe-finder.adapter'
import { DrizzleMenuRepository } from '../contexts/meal-planning/infrastructure/repositories/drizzle-menu.repository'
import { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'
import { Argon2PasswordHasher } from '../contexts/platform/infrastructure/hashers/argon2-password-hasher'
import { DrizzleUserRepository } from '../contexts/platform/infrastructure/repositories/drizzle-user.repository'
import { GenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import { GetShoppingListByMenuUseCase } from '../contexts/shopping/application/use-cases/get-shopping-list-by-menu.use-case'
import { RegenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/regenerate-shopping-list.use-case'
import { ToggleShoppingListItemUseCase } from '../contexts/shopping/application/use-cases/toggle-shopping-list-item.use-case'
import { InventoryAdapter } from '../contexts/shopping/infrastructure/adapters/inventory-snapshot-finder.adapter'
import { MealPlanningMenuSnapshotFinder } from '../contexts/shopping/infrastructure/adapters/menu-snapshot-finder.adapter'
import { CatalogRecipeSnapshotFinder } from '../contexts/shopping/infrastructure/adapters/recipe-snapshot-finder.adapter'
import { DrizzleShoppingListRepository } from '../contexts/shopping/infrastructure/repositories/drizzle-shopping-list.repository'
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

  // ingredients
  const ingredientRepo = new DrizzleIngredientRepository(db)
  const productRepo = new DrizzleProductRepository(db)
  const createIngredient = new CreateIngredientUseCase(ingredientRepo)
  const updateIngredient = new UpdateIngredientUseCase(ingredientRepo, productRepo)
  const deleteIngredient = new DeleteIngredientUseCase(ingredientRepo)
  const listIngredients = new ListIngredientsUseCase(ingredientRepo)
  const getIngredient = new GetIngredientUseCase(ingredientRepo, productRepo)
  const addProduct = new AddProductUseCase(ingredientRepo, productRepo)
  const updateProduct = new UpdateProductUseCase(productRepo)
  const removeProduct = new RemoveProductUseCase(productRepo)
  const resolveByBarcode = new ResolveByBarcodeUseCase(ingredientRepo, productRepo)
  const barcodeResolver = new IngredientBarcodeResolver(resolveByBarcode)
  const seedDefaultIngredients = new SeedDefaultIngredientsUseCase(ingredientRepo)
  const seedInitializer = new SeedDefaultIngredientsInitializer(seedDefaultIngredients)

  // family — seed initializer is injected so every new household gets the default catalog.
  const householdRepo = new DrizzleHouseholdRepository(db)
  const inviteCodes = new CryptoInviteCodeGenerator()

  // inventory
  const inventoryRepo = new DrizzleInventoryItemRepository(db)

  // catalog
  const recipeRepo = new DrizzleRecipeRepository(db)

  // meal-planning
  const menuRepo = new DrizzleMenuRepository(db)
  const recipeFinder = new CatalogRecipeFinder(recipeRepo)

  // shopping
  const shoppingRepo = new DrizzleShoppingListRepository(db)
  const menuSnapshotFinder = new MealPlanningMenuSnapshotFinder(menuRepo)
  const recipeSnapshotFinder = new CatalogRecipeSnapshotFinder(recipeRepo)
  const inventorySnapshotFinder = new InventoryAdapter(inventoryRepo)
  const generateShoppingList = new GenerateShoppingListUseCase(
    shoppingRepo,
    menuSnapshotFinder,
    recipeSnapshotFinder,
    inventorySnapshotFinder,
  )

  return {
    registerUser: new RegisterUserUseCase(userRepo, hasher),
    loginUser: new LoginUserUseCase(userRepo, hasher),
    createHousehold: new CreateHouseholdUseCase(householdRepo, inviteCodes, [seedInitializer]),
    joinHousehold: new JoinHouseholdUseCase(householdRepo),
    leaveHousehold: new LeaveHouseholdUseCase(householdRepo),
    getCurrentHousehold: new GetCurrentHouseholdUseCase(householdRepo),
    createIngredient,
    updateIngredient,
    deleteIngredient,
    listIngredients,
    getIngredient,
    addProduct,
    updateProduct,
    removeProduct,
    resolveByBarcode,
    barcodeResolver,
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
    createMenu: new CreateMenuUseCase(menuRepo),
    getMenuByWeek: new GetMenuByWeekUseCase(menuRepo),
    assignRecipeToSlot: new AssignRecipeToSlotUseCase(menuRepo, recipeFinder),
    clearSlot: new ClearSlotUseCase(menuRepo),
    generateShoppingList,
    regenerateShoppingList: new RegenerateShoppingListUseCase(generateShoppingList),
    getShoppingListByMenu: new GetShoppingListByMenuUseCase(shoppingRepo),
    toggleShoppingListItem: new ToggleShoppingListItemUseCase(shoppingRepo),
  }
}
