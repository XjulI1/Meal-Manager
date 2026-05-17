import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WeekStartSchema } from '../../../../shared/dto/menus'
import { jsonContent, type McpToolContext } from './context'

export function registerMenuTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_get_menu_for_week',
    {
      title: 'Get weekly menu',
      description:
        'Returns the menu (breakfast/lunch/dinner × 7 days) for the given week. '
        + 'IMPORTANT: if no menu exists for that week yet, an empty menu is created and returned '
        + '(matching the existing web behavior — safe and idempotent).',
      inputSchema: {
        weekStart: WeekStartSchema.describe(
          'ISO date (YYYY-MM-DD) of the Monday of the target week. Must be a Monday.',
        ),
      },
    },
    async (args: { weekStart: string }) => {
      const menu = await ctx.container.getMenuByWeek.execute({
        householdId: ctx.householdId,
        weekStart: args.weekStart,
      })
      return jsonContent(menu)
    },
  )
}
