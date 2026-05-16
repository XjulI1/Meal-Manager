import type { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StorageLocationSchema } from '../../../../shared/dto/inventory'
import { jsonContent, type McpToolContext } from './context'

export function registerInventoryTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_list_inventory',
    {
      title: 'List inventory items',
      description:
        'Returns the current inventory of the household (pantry + fridge). '
        + 'Each item has its ingredient name, category, quantity (in canonical unit: g, ml, or unit) and storage location. '
        + 'Use the optional `location` argument to filter by pantry or fridge.',
      inputSchema: {
        location: StorageLocationSchema.optional().describe('Filter: "pantry" or "fridge". Omit to return both.'),
      },
    },
    async (args: { location?: z.infer<typeof StorageLocationSchema> }) => {
      const items = await ctx.container.listInventoryItems.execute({
        householdId: ctx.householdId,
        location: args.location,
      })
      return jsonContent(items)
    },
  )
}
