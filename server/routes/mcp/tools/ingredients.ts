import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  IngredientCategorySchema,
  IngredientStorageSchema,
} from '../../../../shared/dto/ingredient'
import { jsonContent, type McpToolContext } from './context'

export function registerIngredientsTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_list_ingredients',
    {
      title: 'List ingredients catalog',
      description:
        'Returns the ingredients catalog of the household (the master list referenced by inventory items, '
        + 'recipes and shopping lists). Each ingredient has a canonical unit, a category (aisle), a storage '
        + 'location, optional allergens, and optional aliases.',
      inputSchema: {
        query: z.string().trim().min(1).max(100).optional()
          .describe('Match name or alias (case-insensitive substring).'),
        category: IngredientCategorySchema.optional()
          .describe('Filter by category/aisle.'),
        storage: IngredientStorageSchema.optional()
          .describe('Filter by storage location (pantry/fridge).'),
        includeArchived: z.boolean().optional()
          .describe('Set true to include soft-deleted ingredients. Default false.'),
      },
    },
    async (args: {
      query?: string
      category?: z.infer<typeof IngredientCategorySchema>
      storage?: z.infer<typeof IngredientStorageSchema>
      includeArchived?: boolean
    }) => {
      const list = await ctx.container.listIngredients.execute({
        householdId: ctx.householdId,
        q: args.query,
        category: args.category,
        storage: args.storage,
        includeArchived: args.includeArchived,
      })
      return jsonContent(list)
    },
  )

  server.registerTool(
    'mealmanager_get_ingredient',
    {
      title: 'Get ingredient details',
      description:
        'Returns the full details of an ingredient (name, aliases, allergens, '
        + 'category, canonical unit, products attached).',
      inputSchema: {
        ingredientId: z.string().uuid().describe('Ingredient id (UUID).'),
      },
    },
    async (args: { ingredientId: string }) => {
      const ingredient = await ctx.container.getIngredient.execute({
        householdId: ctx.householdId,
        id: args.ingredientId,
      })
      return jsonContent(ingredient)
    },
  )
}
