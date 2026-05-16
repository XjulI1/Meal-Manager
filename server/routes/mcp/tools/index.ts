import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerHouseholdTools } from './household'
import { registerIngredientsTools } from './ingredients'
import { registerInventoryTools } from './inventory'
import { registerMenuTools } from './menu'
import { registerRecipesTools } from './recipes'
import { registerShoppingTools } from './shopping'
import type { McpToolContext } from './context'

/** Registers all read-only Meal Manager tools on the given MCP server. */
export function registerAllTools(server: McpServer, ctx: McpToolContext): void {
  registerInventoryTools(server, ctx)
  registerRecipesTools(server, ctx)
  registerMenuTools(server, ctx)
  registerShoppingTools(server, ctx)
  registerIngredientsTools(server, ctx)
  registerHouseholdTools(server, ctx)
}

export type { McpToolContext } from './context'
