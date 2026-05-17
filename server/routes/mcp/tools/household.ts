import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { jsonContent, type McpToolContext } from './context'

export function registerHouseholdTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_get_household',
    {
      title: 'Get current household',
      description:
        'Returns the household this token is bound to: id, name, invite code, '
        + 'and the list of members (email + joined date).',
      inputSchema: {},
    },
    async () => {
      const household = await ctx.container.getCurrentHousehold.execute({
        userId: ctx.userId,
      })
      return jsonContent(household)
    },
  )
}
