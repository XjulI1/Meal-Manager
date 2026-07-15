import { useDb } from '../database/client'
import { ChatRecipeUseCase } from '../contexts/catalog/application/use-cases/chat-recipe.use-case'
import { CreateRecipeUseCase } from '../contexts/catalog/application/use-cases/create-recipe.use-case'
import { ImportRecipeFromUrlUseCase } from '../contexts/catalog/application/use-cases/import-recipe-from-url.use-case'
import { ImportRecipeFromPhotosUseCase } from '../contexts/catalog/application/use-cases/import-recipe-from-photos.use-case'
import { ResolveRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/resolve-recipe-draft.use-case'
import { SaveRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/save-recipe-draft.use-case'
import { ListRecipeDraftsUseCase } from '../contexts/catalog/application/use-cases/list-recipe-drafts.use-case'
import { GetRecipeDraftByIdUseCase } from '../contexts/catalog/application/use-cases/get-recipe-draft-by-id.use-case'
import { UpdateRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/update-recipe-draft.use-case'
import { DeleteRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/delete-recipe-draft.use-case'
import { DeleteRecipeUseCase } from '../contexts/catalog/application/use-cases/delete-recipe.use-case'
import { GetRecipeByIdUseCase } from '../contexts/catalog/application/use-cases/get-recipe-by-id.use-case'
import { ListRecipesUseCase } from '../contexts/catalog/application/use-cases/list-recipes.use-case'
import { UpdateRecipeUseCase } from '../contexts/catalog/application/use-cases/update-recipe.use-case'
import { AnthropicRecipeChatService } from '../contexts/catalog/infrastructure/adapters/anthropic-recipe-chat.service'
import { AnthropicRecipeImporter } from '../contexts/catalog/infrastructure/adapters/anthropic-recipe-importer'
import { AnthropicRecipePhotoImporter } from '../contexts/catalog/infrastructure/adapters/anthropic-recipe-photo-importer'
import { DEFAULT_CHAT_EFFORT, DEFAULT_IMPORT_EFFORT, DEFAULT_PHOTO_EFFORT, parseEffort } from '../contexts/catalog/infrastructure/anthropic-config'
import { DrizzleRecipeRepository } from '../contexts/catalog/infrastructure/repositories/drizzle-recipe.repository'
import { DrizzleRecipeDraftRepository } from '../contexts/catalog/infrastructure/repositories/drizzle-recipe-draft.repository'
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
import { CreateCellarUseCase } from '../contexts/wine-cellar/application/use-cases/create-cellar.use-case'
import { ListCellarsUseCase } from '../contexts/wine-cellar/application/use-cases/list-cellars.use-case'
import { RenameCellarUseCase } from '../contexts/wine-cellar/application/use-cases/rename-cellar.use-case'
import { DeleteCellarUseCase } from '../contexts/wine-cellar/application/use-cases/delete-cellar.use-case'
import { GetCellarLayoutUseCase } from '../contexts/wine-cellar/application/use-cases/get-cellar-layout.use-case'
import { AddShelfUseCase } from '../contexts/wine-cellar/application/use-cases/add-shelf.use-case'
import { DeleteShelfUseCase } from '../contexts/wine-cellar/application/use-cases/delete-shelf.use-case'
import { RenameShelfUseCase } from '../contexts/wine-cellar/application/use-cases/rename-shelf.use-case'
import { AddRowUseCase } from '../contexts/wine-cellar/application/use-cases/add-row.use-case'
import { UpdateRowUseCase } from '../contexts/wine-cellar/application/use-cases/update-row.use-case'
import { DeleteRowUseCase } from '../contexts/wine-cellar/application/use-cases/delete-row.use-case'
import { CreateWineUseCase } from '../contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { UpdateWineUseCase } from '../contexts/wine-cellar/application/use-cases/update-wine.use-case'
import { ListWinesUseCase } from '../contexts/wine-cellar/application/use-cases/list-wines.use-case'
import { GetWineUseCase } from '../contexts/wine-cellar/application/use-cases/get-wine.use-case'
import { AddBottlesUseCase } from '../contexts/wine-cellar/application/use-cases/add-bottles.use-case'
import { PlaceBottleUseCase } from '../contexts/wine-cellar/application/use-cases/place-bottle.use-case'
import { UpdateBottleUseCase } from '../contexts/wine-cellar/application/use-cases/update-bottle.use-case'
import { ExitBottleUseCase } from '../contexts/wine-cellar/application/use-cases/exit-bottle.use-case'
import { ListBottlesUseCase } from '../contexts/wine-cellar/application/use-cases/list-bottles.use-case'
import { GetApogeeCalendarUseCase } from '../contexts/wine-cellar/application/use-cases/get-apogee-calendar.use-case'
import { ListExitJournalUseCase } from '../contexts/wine-cellar/application/use-cases/list-exit-journal.use-case'
import { ImportVinotagUseCase } from '../contexts/wine-cellar/application/use-cases/import-vinotag.use-case'
import { ScanWineLabelUseCase } from '../contexts/wine-cellar/application/use-cases/scan-wine-label.use-case'
import { EnrichWineUseCase } from '../contexts/wine-cellar/application/use-cases/enrich-wine.use-case'
import { SaveWineEnrichmentUseCase } from '../contexts/wine-cellar/application/use-cases/save-wine-enrichment.use-case'
import { DrizzleCellarRepository } from '../contexts/wine-cellar/infrastructure/repositories/drizzle-cellar.repository'
import { DrizzleWineRepository } from '../contexts/wine-cellar/infrastructure/repositories/drizzle-wine.repository'
import { DrizzleBottleRepository } from '../contexts/wine-cellar/infrastructure/repositories/drizzle-bottle.repository'
import { ExcelJsWineImportParser } from '../contexts/wine-cellar/infrastructure/adapters/exceljs-wine-import-parser'
import { AnthropicWineLabelExtractor } from '../contexts/wine-cellar/infrastructure/adapters/anthropic-wine-label-extractor'
import { AnthropicWineEnricher } from '../contexts/wine-cellar/infrastructure/adapters/anthropic-wine-enricher'
import { FilesystemLabelPhotoStorage } from '../contexts/wine-cellar/infrastructure/adapters/filesystem-label-photo-storage'
import { DEFAULT_LABEL_EFFORT, DEFAULT_ENRICH_EFFORT, parseEffort as parseLabelEffort } from '../contexts/wine-cellar/infrastructure/anthropic-config'
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
  const recipeDraftRepo = new DrizzleRecipeDraftRepository(db)
  // AI recipe assistant — config from runtimeConfig (server-only). Key, model
  // and effort are overridable via NUXT_ANTHROPIC_* env vars; gated per account.
  const aiConfig = useRuntimeConfig()
  const recipeChatAssistant = new AnthropicRecipeChatService(
    aiConfig.anthropicApiKey,
    aiConfig.anthropicModel,
    parseEffort(aiConfig.anthropicChatEffort, DEFAULT_CHAT_EFFORT),
  )
  const recipeImporter = new AnthropicRecipeImporter(
    aiConfig.anthropicApiKey,
    aiConfig.anthropicModel,
    parseEffort(aiConfig.anthropicImportEffort, DEFAULT_IMPORT_EFFORT),
  )
  const recipePhotoImporter = new AnthropicRecipePhotoImporter(
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

  // wine-cellar
  const cellarRepo = new DrizzleCellarRepository(db)
  const wineRepo = new DrizzleWineRepository(db)
  const bottleRepo = new DrizzleBottleRepository(db)
  const wineImportParser = new ExcelJsWineImportParser()
  const labelPhotoStorage = new FilesystemLabelPhotoStorage(aiConfig.wineLabelDir)
  const wineLabelExtractor = new AnthropicWineLabelExtractor(
    aiConfig.anthropicApiKey,
    aiConfig.anthropicModel,
    parseLabelEffort(aiConfig.anthropicLabelEffort, DEFAULT_LABEL_EFFORT),
  )
  const wineEnricher = new AnthropicWineEnricher(
    aiConfig.anthropicApiKey,
    aiConfig.anthropicModel,
    parseLabelEffort(aiConfig.anthropicEnrichEffort, DEFAULT_ENRICH_EFFORT),
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
    saveRecipeDraft: new SaveRecipeDraftUseCase(recipeDraftRepo),
    listRecipeDrafts: new ListRecipeDraftsUseCase(recipeDraftRepo),
    getRecipeDraftById: new GetRecipeDraftByIdUseCase(recipeDraftRepo),
    updateRecipeDraft: new UpdateRecipeDraftUseCase(recipeDraftRepo),
    deleteRecipeDraft: new DeleteRecipeDraftUseCase(recipeDraftRepo),
    createMenu: new CreateMenuUseCase(menuRepo),
    getMenuByWeek: new GetMenuByWeekUseCase(menuRepo),
    assignRecipeToSlot: new AssignRecipeToSlotUseCase(menuRepo, recipeFinder),
    clearSlot: new ClearSlotUseCase(menuRepo),
    generateShoppingList,
    regenerateShoppingList: new RegenerateShoppingListUseCase(generateShoppingList),
    getShoppingListByMenu: new GetShoppingListByMenuUseCase(shoppingRepo),
    toggleShoppingListItem: new ToggleShoppingListItemUseCase(shoppingRepo),
    createCellar: new CreateCellarUseCase(cellarRepo),
    listCellars: new ListCellarsUseCase(cellarRepo, bottleRepo),
    renameCellar: new RenameCellarUseCase(cellarRepo, bottleRepo),
    deleteCellar: new DeleteCellarUseCase(cellarRepo),
    getCellarLayout: new GetCellarLayoutUseCase(cellarRepo, bottleRepo, wineRepo),
    addShelf: new AddShelfUseCase(cellarRepo),
    renameShelf: new RenameShelfUseCase(cellarRepo),
    deleteShelf: new DeleteShelfUseCase(cellarRepo, bottleRepo),
    addRow: new AddRowUseCase(cellarRepo),
    updateRow: new UpdateRowUseCase(cellarRepo, bottleRepo, wineRepo),
    deleteRow: new DeleteRowUseCase(cellarRepo, bottleRepo),
    createWine: new CreateWineUseCase(wineRepo, labelPhotoStorage),
    updateWine: new UpdateWineUseCase(wineRepo, bottleRepo, labelPhotoStorage),
    listWines: new ListWinesUseCase(wineRepo, bottleRepo),
    getWine: new GetWineUseCase(wineRepo, bottleRepo, cellarRepo),
    addBottles: new AddBottlesUseCase(wineRepo, bottleRepo),
    placeBottle: new PlaceBottleUseCase(bottleRepo, cellarRepo),
    updateBottle: new UpdateBottleUseCase(bottleRepo, cellarRepo),
    exitBottle: new ExitBottleUseCase(bottleRepo),
    listBottles: new ListBottlesUseCase(bottleRepo, wineRepo, cellarRepo),
    getApogeeCalendar: new GetApogeeCalendarUseCase(wineRepo, bottleRepo),
    listExitJournal: new ListExitJournalUseCase(bottleRepo, wineRepo),
    importVinotag: new ImportVinotagUseCase(wineImportParser, wineRepo, bottleRepo),
    scanWineLabel: new ScanWineLabelUseCase(wineLabelExtractor),
    enrichWine: new EnrichWineUseCase(wineRepo, bottleRepo, wineEnricher),
    saveWineEnrichment: new SaveWineEnrichmentUseCase(wineRepo, bottleRepo),
  }
}
