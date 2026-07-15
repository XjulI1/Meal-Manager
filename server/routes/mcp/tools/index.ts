import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerHouseholdTools } from './household'
import { registerIngredientsTools } from './ingredients'
import { registerInventoryTools } from './inventory'
import { registerMenuTools } from './menu'
import { registerRecipeDraftsTools } from './recipe-drafts'
import { registerRecipesTools } from './recipes'
import { registerShoppingTools } from './shopping'
import { registerWineTools } from './wine'
import type { McpToolContext } from './context'

/**
 * Registers all Meal Manager tools on the given MCP server. Read-only except
 * the write tools (`mealmanager_save_recipe_draft`, `mealmanager_create_ingredient`,
 * `mealmanager_add_inventory_item`, `mealmanager_save_wine_enrichment`).
 */
export function registerAllTools(server: McpServer, ctx: McpToolContext): void {
  registerInventoryTools(server, ctx)
  registerRecipesTools(server, ctx)
  registerRecipeDraftsTools(server, ctx)
  registerMenuTools(server, ctx)
  registerShoppingTools(server, ctx)
  registerIngredientsTools(server, ctx)
  registerHouseholdTools(server, ctx)
  registerWineTools(server, ctx)
}

export type { McpToolContext } from './context'
