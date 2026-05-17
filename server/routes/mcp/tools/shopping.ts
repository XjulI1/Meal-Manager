import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { jsonContent, type McpToolContext } from './context'

export function registerShoppingTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_get_shopping_list',
    {
      title: 'Get shopping list for a menu',
      description:
        'Returns the shopping list snapshot generated from a given weekly menu '
        + '(menu ingredients × servings − current inventory). Items are aggregated by ingredient. '
        + 'Each item carries `isChecked` indicating whether it has been purchased.',
      inputSchema: {
        menuId: z.string().uuid().describe(
          'Menu id (UUID), obtained from `mealmanager_get_menu_for_week`.',
        ),
      },
    },
    async (args: { menuId: string }) => {
      const list = await ctx.container.getShoppingListByMenu.execute({
        householdId: ctx.householdId,
        menuId: args.menuId,
      })
      return jsonContent(list)
    },
  )
}
