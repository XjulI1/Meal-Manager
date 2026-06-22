import { useDb } from '../database/client'
import { ChatRecipeUseCase } from '../contexts/catalog/application/use-cases/chat-recipe.use-case'
import { CreateRecipeUseCase } from '../contexts/catalog/application/use-cases/create-recipe.use-case'
import { ImportRecipeFromUrlUseCase } from '../contexts/catalog/application/use-cases/import-recipe-from-url.use-case'
import { ImportRecipeFromPhotosUseCase } from '../contexts/catalog/application/use-cases/import-recipe-from-photos.use-case'
import { ResolveRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/resolve-recipe-draft.use-case'
import { DeleteRecipeUseCase } from '../contexts/catalog/application/use-cases/delete-recipe.use-case'
import { GetRecipeByIdUseCase } from '../contexts/catalog/application/use-cases/get-recipe-by-id.use-case'
import { ListRecipesUseCase } from '../contexts/catalog/application/use-cases/list-recipes.use-case'
import { UpdateRecipeUseCase } from '../contexts/catalog/application/use-cases/update-recipe.use-case'
import { AnthropicRecipeChatService } from '../contexts/catalog/infrastructure/adapters/anthropic-recipe-chat.service'
import { AnthropicRecipeImporter } from '../contexts/catalog/infrastructure/adapters/anthropic-recipe-importer'
import { AnthropicRecipePhotoImporter } from '../contexts/catalog/infrastructure/adapters/anthropic-recipe-photo-importer'
import { MistralRecipeChatService } from '../contexts/catalog/infrastructure/adapters/mistral-recipe-chat.service'
import { MistralRecipeImporter } from '../contexts/catalog/infrastructure/adapters/mistral-recipe-importer'
import { MistralRecipePhotoImporter } from '../contexts/catalog/infrastructure/adapters/mistral-recipe-photo-importer'
import { DEFAULT_CHAT_EFFORT, DEFAULT_IMPORT_EFFORT, DEFAULT_PHOTO_EFFORT, parseEffort } from '../contexts/catalog/infrastructure/anthropic-config'
import {
  DEFAULT_CHAT_EFFORT as MISTRAL_DEFAULT_CHAT_EFFORT,
  DEFAULT_IMPORT_EFFORT as MISTRAL_DEFAULT_IMPORT_EFFORT,
  DEFAULT_PHOTO_EFFORT as MISTRAL_DEFAULT_PHOTO_EFFORT,
  parseEffort as parseMistralEffort,
} from '../contexts/catalog/infrastructure/mistral-config'
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
import { GetProductUseCase } from '../contexts/ingredients/application/use-cases/get-product.use-case'
import { ListIngredientsUseCase } from '../contexts/ingredients/application/use-cases/list-ingredients.use-case'
import { RemoveProductUseCase } from '../contexts/ingredients/application/use-cases/remove-product.use-case'
import { ResolveByBarcodeUseCase } from '../contexts/ingredients/application/use-cases/resolve-by-barcode.use-case'
import { SeedDefaultIngredientsUseCase } from '../contexts/ingredients/application/use-cases/seed-default-ingredients.use-case'
import { UpdateIngredientUseCase } from '../contexts/ingredients/application/use-cases/update-ingredient.use-case'
import { UpdateProductUseCase } from '../contexts/ingredients/application/use-cases/update-product.use-case'
import { IngredientBarcodeResolver } from '../contexts/ingredients/infrastructure/ingredient-barcode-resolver.adapter'
import { IngredientLookupAdapter } from '../contexts/ingredients/infrastructure/ingredient-lookup.adapter'
import { ProductLookupAdapter } from '../contexts/ingredients/infrastructure/product-lookup.adapter'
import { DrizzleIngredientRepository } from '../contexts/ingredients/infrastructure/repositories/drizzle-ingredient.repository'
import { DrizzleProductRepository } from '../contexts/ingredients/infrastructure/repositories/drizzle-product.repository'
import { SeedDefaultIngredientsInitializer } from '../contexts/ingredients/infrastructure/seed-default-ingredients.initializer'
import { AddInventoryItemFromProductScanUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case'
import { AddInventoryItemUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { AdjustQuantityUseCase } from '../contexts/inventory/application/use-cases/adjust-quantity.use-case'
import { ConsumeInventoryItemByBarcodeUseCase } from '../contexts/inventory/application/use-cases/consume-inventory-item-by-barcode.use-case'
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
import { AuthenticatePersonalAccessTokenUseCase } from '../contexts/platform/application/use-cases/authenticate-personal-access-token.use-case'
import { GetUserAiAccessUseCase } from '../contexts/platform/application/use-cases/get-user-ai-access.use-case'
import { CreatePersonalAccessTokenUseCase } from '../contexts/platform/application/use-cases/create-personal-access-token.use-case'
import { ListPersonalAccessTokensUseCase } from '../contexts/platform/application/use-cases/list-personal-access-tokens.use-case'
import { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'
import { RevokePersonalAccessTokenUseCase } from '../contexts/platform/application/use-cases/revoke-personal-access-token.use-case'
import { CryptoTokenGenerator } from '../contexts/platform/infrastructure/crypto-token-generator'
import { Argon2PasswordHasher } from '../contexts/platform/infrastructure/hashers/argon2-password-hasher'
import { DrizzlePersonalAccessTokenRepository } from '../contexts/platform/infrastructure/repositories/drizzle-personal-access-token.repository'
import { DrizzleUserRepository } from '../contexts/platform/infrastructure/repositories/drizzle-user.repository'
import { FamilyUserHouseholdResolverAdapter } from '../contexts/family/infrastructure/family-user-household-resolver.adapter'
import { GenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import { GetShoppingListByMenuUseCase } from '../contexts/shopping/application/use-cases/get-shopping-list-by-menu.use-case'
import { RegenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/regenerate-shopping-list.use-case'
import { ToggleShoppingListItemUseCase } from '../contexts/shopping/application/use-cases/toggle-shopping-list-item.use-case'
import { IngredientsCatalogSummaryFinder } from '../contexts/shopping/infrastructure/adapters/ingredient-summary-finder.adapter'
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
  const patRepo = new DrizzlePersonalAccessTokenRepository(db)
  const tokenGenerator = new CryptoTokenGenerator()

  // ingredients
  const ingredientRepo = new DrizzleIngredientRepository(db)
  const productRepo = new DrizzleProductRepository(db)
  const createIngredient = new CreateIngredientUseCase(ingredientRepo)
  const updateIngredient = new UpdateIngredientUseCase(ingredientRepo, productRepo)
  const deleteIngredient = new DeleteIngredientUseCase(ingredientRepo)
  const listIngredients = new ListIngredientsUseCase(ingredientRepo)
  const getIngredient = new GetIngredientUseCase(ingredientRepo, productRepo)
  const addProduct = new AddProductUseCase(ingredientRepo, productRepo)
  const getProduct = new GetProductUseCase(productRepo)
  const updateProduct = new UpdateProductUseCase(productRepo)
  const removeProduct = new RemoveProductUseCase(productRepo)
  const resolveByBarcode = new ResolveByBarcodeUseCase(ingredientRepo, productRepo)
  const barcodeResolver = new IngredientBarcodeResolver(resolveByBarcode)
  const seedDefaultIngredients = new SeedDefaultIngredientsUseCase(ingredientRepo)
  const seedInitializer = new SeedDefaultIngredientsInitializer(seedDefaultIngredients)
  /** Cross-context lookup: inventory & catalog use this to resolve ingredient metadata at read time. */
  const ingredientLookup = new IngredientLookupAdapter(ingredientRepo)
  /** Cross-context lookup: inventory uses this to resolve a productId on `POST /api/inventory/from-scan`. */
  const productLookup = new ProductLookupAdapter(productRepo)

  // family — seed initializer is injected so every new household gets the default catalog.
  const householdRepo = new DrizzleHouseholdRepository(db)
  const inviteCodes = new CryptoInviteCodeGenerator()
  /** Cross-context: implements platform's `IUserHouseholdResolver` via family's household repo. */
  const userHouseholdResolver = new FamilyUserHouseholdResolverAdapter(householdRepo)

  // inventory
  const inventoryRepo = new DrizzleInventoryItemRepository(db)
  const addInventoryItem = new AddInventoryItemUseCase(inventoryRepo, ingredientLookup)

  // catalog
  const recipeRepo = new DrizzleRecipeRepository(db)
  // AI recipe assistant — config from runtimeConfig (server-only). Key, model
  // and effort are overridable via NUXT_ANTHROPIC_* env vars; gated per account.
  const aiConfig = useRuntimeConfig()
  // Provider switch — same ports, swappable adapters (NUXT_RECIPE_AI_PROVIDER).
  const useMistral = aiConfig.recipeAiProvider === 'mistral'
  const recipeChatAssistant = useMistral
    ? new MistralRecipeChatService(
        aiConfig.mistralApiKey,
        aiConfig.mistralModel,
        parseMistralEffort(aiConfig.mistralChatEffort, MISTRAL_DEFAULT_CHAT_EFFORT),
      )
    : new AnthropicRecipeChatService(
        aiConfig.anthropicApiKey,
        aiConfig.anthropicModel,
        parseEffort(aiConfig.anthropicChatEffort, DEFAULT_CHAT_EFFORT),
      )
  const recipeImporter = useMistral
    ? new MistralRecipeImporter(
        aiConfig.mistralApiKey,
        aiConfig.mistralModel,
        parseMistralEffort(aiConfig.mistralImportEffort, MISTRAL_DEFAULT_IMPORT_EFFORT),
      )
    : new AnthropicRecipeImporter(
        aiConfig.anthropicApiKey,
        aiConfig.anthropicModel,
        parseEffort(aiConfig.anthropicImportEffort, DEFAULT_IMPORT_EFFORT),
      )
  const recipePhotoImporter = useMistral
    ? new MistralRecipePhotoImporter(
        aiConfig.mistralApiKey,
        aiConfig.mistralModel,
        parseMistralEffort(aiConfig.mistralPhotoEffort, MISTRAL_DEFAULT_PHOTO_EFFORT),
      )
    : new AnthropicRecipePhotoImporter(
        aiConfig.anthropicApiKey,
        aiConfig.anthropicModel,
        parseEffort(aiConfig.anthropicPhotoEffort, DEFAULT_PHOTO_EFFORT),
      )

  // meal-planning
  const menuRepo = new DrizzleMenuRepository(db)
  const recipeFinder = new CatalogRecipeFinder(recipeRepo)

  // shopping
  const shoppingRepo = new DrizzleShoppingListRepository(db)
  const menuSnapshotFinder = new MealPlanningMenuSnapshotFinder(menuRepo)
  const recipeSnapshotFinder = new CatalogRecipeSnapshotFinder(recipeRepo)
  const inventorySnapshotFinder = new InventoryAdapter(inventoryRepo)
  const ingredientSummaryFinder = new IngredientsCatalogSummaryFinder(ingredientRepo)
  const generateShoppingList = new GenerateShoppingListUseCase(
    shoppingRepo,
    menuSnapshotFinder,
    recipeSnapshotFinder,
    inventorySnapshotFinder,
    ingredientSummaryFinder,
  )

  return {
    registerUser: new RegisterUserUseCase(userRepo, hasher),
    loginUser: new LoginUserUseCase(userRepo, hasher),
    createPersonalAccessToken: new CreatePersonalAccessTokenUseCase(patRepo, userHouseholdResolver, tokenGenerator),
    listPersonalAccessTokens: new ListPersonalAccessTokensUseCase(patRepo),
    revokePersonalAccessToken: new RevokePersonalAccessTokenUseCase(patRepo),
    authenticatePersonalAccessToken: new AuthenticatePersonalAccessTokenUseCase(patRepo, tokenGenerator),
    getUserAiAccess: new GetUserAiAccessUseCase(userRepo),
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
    getProduct,
    updateProduct,
    removeProduct,
    resolveByBarcode,
    barcodeResolver,
    productLookup,
    addInventoryItem,
    addInventoryItemFromProductScan: new AddInventoryItemFromProductScanUseCase(productLookup, addInventoryItem),
    consumeInventoryItemByBarcode: new ConsumeInventoryItemByBarcodeUseCase(inventoryRepo, barcodeResolver, ingredientLookup),
    updateInventoryItem: new UpdateInventoryItemUseCase(inventoryRepo, ingredientLookup),
    removeInventoryItem: new RemoveInventoryItemUseCase(inventoryRepo),
    listInventoryItems: new ListInventoryItemsUseCase(inventoryRepo, ingredientLookup),
    adjustInventoryQuantity: new AdjustQuantityUseCase(inventoryRepo, ingredientLookup),
    createRecipe: new CreateRecipeUseCase(recipeRepo, ingredientLookup),
    updateRecipe: new UpdateRecipeUseCase(recipeRepo, ingredientLookup),
    deleteRecipe: new DeleteRecipeUseCase(recipeRepo),
    listRecipes: new ListRecipesUseCase(recipeRepo),
    getRecipeById: new GetRecipeByIdUseCase(recipeRepo, ingredientLookup),
    chatRecipe: new ChatRecipeUseCase(recipeChatAssistant),
    importRecipeFromUrl: new ImportRecipeFromUrlUseCase(recipeImporter),
    importRecipeFromPhotos: new ImportRecipeFromPhotosUseCase(recipePhotoImporter),
    resolveRecipeDraft: new ResolveRecipeDraftUseCase(ingredientLookup),
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
