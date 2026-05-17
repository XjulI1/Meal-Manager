import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { jsonContent, type McpToolContext } from './context'

export function registerRecipesTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_list_recipes',
    {
      title: 'List recipes',
      description:
        'Returns the household recipe catalog (id, title, servings, last updated). '
        + 'Use the optional `query` argument to filter by title substring (case-insensitive).',
      inputSchema: {
        query: z.string().trim().min(1).max(100).optional().describe('Optional title substring filter.'),
      },
    },
    async (args: { query?: string }) => {
      const recipes = await ctx.container.listRecipes.execute({
        householdId: ctx.householdId,
        query: args.query,
      })
      return jsonContent(recipes)
    },
  )

  server.registerTool(
    'mealmanager_get_recipe',
    {
      title: 'Get recipe details',
      description:
        'Returns the full details of a recipe (title, servings, instructions, ingredient list). '
        + 'Each ingredient line includes the ingredient id, name, and quantity in canonical unit.',
      inputSchema: {
        recipeId: z.string().uuid().describe('Recipe id (UUID), obtained from `mealmanager_list_recipes`.'),
      },
    },
    async (args: { recipeId: string }) => {
      const recipe = await ctx.container.getRecipeById.execute({
        householdId: ctx.householdId,
        id: args.recipeId,
      })
      return jsonContent(recipe)
    },
  )
}
