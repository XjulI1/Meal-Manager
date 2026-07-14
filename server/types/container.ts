import type { ChatRecipeUseCase } from '../contexts/catalog/application/use-cases/chat-recipe.use-case'
import type { CreateRecipeUseCase } from '../contexts/catalog/application/use-cases/create-recipe.use-case'
import type { ImportRecipeFromUrlUseCase } from '../contexts/catalog/application/use-cases/import-recipe-from-url.use-case'
import type { ImportRecipeFromPhotosUseCase } from '../contexts/catalog/application/use-cases/import-recipe-from-photos.use-case'
import type { ResolveRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/resolve-recipe-draft.use-case'
import type { SaveRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/save-recipe-draft.use-case'
import type { ListRecipeDraftsUseCase } from '../contexts/catalog/application/use-cases/list-recipe-drafts.use-case'
import type { GetRecipeDraftByIdUseCase } from '../contexts/catalog/application/use-cases/get-recipe-draft-by-id.use-case'
import type { UpdateRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/update-recipe-draft.use-case'
import type { DeleteRecipeDraftUseCase } from '../contexts/catalog/application/use-cases/delete-recipe-draft.use-case'
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
import type { IProductLookup } from '../contexts/inventory/domain/ports/product-lookup.port'
import type { AssignRecipeToSlotUseCase } from '../contexts/meal-planning/application/use-cases/assign-recipe-to-slot.use-case'
import type { ClearSlotUseCase } from '../contexts/meal-planning/application/use-cases/clear-slot.use-case'
import type { CreateMenuUseCase } from '../contexts/meal-planning/application/use-cases/create-menu.use-case'
import type { GetMenuByWeekUseCase } from '../contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import type { AddInventoryItemFromProductScanUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case'
import type { AddInventoryItemUseCase } from '../contexts/inventory/application/use-cases/add-inventory-item.use-case'
import type { AdjustQuantityUseCase } from '../contexts/inventory/application/use-cases/adjust-quantity.use-case'
import type { ConsumeInventoryItemByBarcodeUseCase } from '../contexts/inventory/application/use-cases/consume-inventory-item-by-barcode.use-case'
import type { ListInventoryItemsUseCase } from '../contexts/inventory/application/use-cases/list-inventory-items.use-case'
import type { RemoveInventoryItemUseCase } from '../contexts/inventory/application/use-cases/remove-inventory-item.use-case'
import type { UpdateInventoryItemUseCase } from '../contexts/inventory/application/use-cases/update-inventory-item.use-case'
import type { AuthenticatePersonalAccessTokenUseCase } from '../contexts/platform/application/use-cases/authenticate-personal-access-token.use-case'
import type { CreatePersonalAccessTokenUseCase } from '../contexts/platform/application/use-cases/create-personal-access-token.use-case'
import type { ListPersonalAccessTokensUseCase } from '../contexts/platform/application/use-cases/list-personal-access-tokens.use-case'
import type { GetUserAiAccessUseCase } from '../contexts/platform/application/use-cases/get-user-ai-access.use-case'
import type { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import type { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'
import type { RevokePersonalAccessTokenUseCase } from '../contexts/platform/application/use-cases/revoke-personal-access-token.use-case'
import type { GenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import type { GetShoppingListByMenuUseCase } from '../contexts/shopping/application/use-cases/get-shopping-list-by-menu.use-case'
import type { RegenerateShoppingListUseCase } from '../contexts/shopping/application/use-cases/regenerate-shopping-list.use-case'
import type { ToggleShoppingListItemUseCase } from '../contexts/shopping/application/use-cases/toggle-shopping-list-item.use-case'
import type { CreateCellarUseCase } from '../contexts/wine-cellar/application/use-cases/create-cellar.use-case'
import type { ListCellarsUseCase } from '../contexts/wine-cellar/application/use-cases/list-cellars.use-case'
import type { RenameCellarUseCase } from '../contexts/wine-cellar/application/use-cases/rename-cellar.use-case'
import type { DeleteCellarUseCase } from '../contexts/wine-cellar/application/use-cases/delete-cellar.use-case'
import type { GetCellarLayoutUseCase } from '../contexts/wine-cellar/application/use-cases/get-cellar-layout.use-case'
import type { AddShelfUseCase } from '../contexts/wine-cellar/application/use-cases/add-shelf.use-case'
import type { DeleteShelfUseCase } from '../contexts/wine-cellar/application/use-cases/delete-shelf.use-case'
import type { RenameShelfUseCase } from '../contexts/wine-cellar/application/use-cases/rename-shelf.use-case'
import type { AddRowUseCase } from '../contexts/wine-cellar/application/use-cases/add-row.use-case'
import type { UpdateRowUseCase } from '../contexts/wine-cellar/application/use-cases/update-row.use-case'
import type { DeleteRowUseCase } from '../contexts/wine-cellar/application/use-cases/delete-row.use-case'
import type { CreateWineUseCase } from '../contexts/wine-cellar/application/use-cases/create-wine.use-case'
import type { UpdateWineUseCase } from '../contexts/wine-cellar/application/use-cases/update-wine.use-case'
import type { ListWinesUseCase } from '../contexts/wine-cellar/application/use-cases/list-wines.use-case'
import type { GetWineUseCase } from '../contexts/wine-cellar/application/use-cases/get-wine.use-case'
import type { AddBottlesUseCase } from '../contexts/wine-cellar/application/use-cases/add-bottles.use-case'
import type { PlaceBottleUseCase } from '../contexts/wine-cellar/application/use-cases/place-bottle.use-case'
import type { UpdateBottleUseCase } from '../contexts/wine-cellar/application/use-cases/update-bottle.use-case'
import type { ExitBottleUseCase } from '../contexts/wine-cellar/application/use-cases/exit-bottle.use-case'
import type { ListBottlesUseCase } from '../contexts/wine-cellar/application/use-cases/list-bottles.use-case'
import type { ListExitJournalUseCase } from '../contexts/wine-cellar/application/use-cases/list-exit-journal.use-case'
import type { ImportVinotagUseCase } from '../contexts/wine-cellar/application/use-cases/import-vinotag.use-case'
import type { ScanWineLabelUseCase } from '../contexts/wine-cellar/application/use-cases/scan-wine-label.use-case'

export interface Container {
  // platform
  registerUser: RegisterUserUseCase
  loginUser: LoginUserUseCase
  createPersonalAccessToken: CreatePersonalAccessTokenUseCase
  listPersonalAccessTokens: ListPersonalAccessTokensUseCase
  revokePersonalAccessToken: RevokePersonalAccessTokenUseCase
  authenticatePersonalAccessToken: AuthenticatePersonalAccessTokenUseCase
  /** Authoritative AI-access check for the AI route guard (reads the DB flag). */
  getUserAiAccess: GetUserAiAccessUseCase
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
  /** Implements the inventory IProductLookup port, bound to the in-household catalog. */
  productLookup: IProductLookup
  // inventory
  addInventoryItem: AddInventoryItemUseCase
  addInventoryItemFromProductScan: AddInventoryItemFromProductScanUseCase
  consumeInventoryItemByBarcode: ConsumeInventoryItemByBarcodeUseCase
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
  /** AI recipe assistant (chat / import / draft resolution) — gated per account. */
  chatRecipe: ChatRecipeUseCase
  importRecipeFromUrl: ImportRecipeFromUrlUseCase
  importRecipeFromPhotos: ImportRecipeFromPhotosUseCase
  resolveRecipeDraft: ResolveRecipeDraftUseCase
  /** Persisted per-household recipe drafts (manual / AI / MCP origins). */
  saveRecipeDraft: SaveRecipeDraftUseCase
  listRecipeDrafts: ListRecipeDraftsUseCase
  getRecipeDraftById: GetRecipeDraftByIdUseCase
  updateRecipeDraft: UpdateRecipeDraftUseCase
  deleteRecipeDraft: DeleteRecipeDraftUseCase
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
  // wine-cellar
  createCellar: CreateCellarUseCase
  listCellars: ListCellarsUseCase
  renameCellar: RenameCellarUseCase
  deleteCellar: DeleteCellarUseCase
  getCellarLayout: GetCellarLayoutUseCase
  addShelf: AddShelfUseCase
  renameShelf: RenameShelfUseCase
  deleteShelf: DeleteShelfUseCase
  addRow: AddRowUseCase
  updateRow: UpdateRowUseCase
  deleteRow: DeleteRowUseCase
  createWine: CreateWineUseCase
  updateWine: UpdateWineUseCase
  listWines: ListWinesUseCase
  getWine: GetWineUseCase
  addBottles: AddBottlesUseCase
  placeBottle: PlaceBottleUseCase
  updateBottle: UpdateBottleUseCase
  exitBottle: ExitBottleUseCase
  listBottles: ListBottlesUseCase
  listExitJournal: ListExitJournalUseCase
  importVinotag: ImportVinotagUseCase
  scanWineLabel: ScanWineLabelUseCase
}

declare module 'h3' {
  interface H3EventContext {
    container: Container
    user?: { id: string, email: string, aiEnabled?: boolean }
  }
}

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    /** UI hint for AI feature access; the server gate is authoritative (DB). */
    aiEnabled: boolean
  }
}

export {}
