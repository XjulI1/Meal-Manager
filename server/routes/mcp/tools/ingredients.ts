import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  CanonicalUnitSchema,
  IngredientCategorySchema,
  IngredientStorageSchema,
} from '../../../../shared/dto/ingredient'
import { DuplicateIngredientNameError } from '../../../contexts/ingredients/domain/errors/duplicate-ingredient-name.error'
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

  server.registerTool(
    'mealmanager_create_ingredient',
    {
      title: 'Create an ingredient',
      description:
        'Creates an ingredient in the household catalog (the master list referenced by inventory items, '
        + 'recipes and shopping lists). Provide the minimal fields only; advanced fields (aliases, allergens, '
        + 'shelf life, image, default pack size) are managed from the web app. The canonical unit is locked once '
        + 'the ingredient is used, so choose the dimension carefully: `g` for mass, `ml` for volume, `unit` for '
        + 'countable items. Returns the created ingredient (including its `id`), which you can pass to '
        + '`mealmanager_add_inventory_item`.',
      inputSchema: {
        name: z.string().min(1).max(100).trim().describe('Ingredient name (e.g. "Courgette", "Farine").'),
        category: IngredientCategorySchema.describe('Category/aisle (e.g. "produce", "dairy").'),
        canonicalUnit: CanonicalUnitSchema.describe('Canonical unit: "g" (mass), "ml" (volume) or "unit" (count).'),
        storage: IngredientStorageSchema.describe('Default storage location: "pantry", "fridge" or "freezer".'),
      },
    },
    async (args: {
      name: string
      category: z.infer<typeof IngredientCategorySchema>
      canonicalUnit: z.infer<typeof CanonicalUnitSchema>
      storage: z.infer<typeof IngredientStorageSchema>
    }) => {
      try {
        const view = await ctx.container.createIngredient.execute({
          householdId: ctx.householdId,
          name: args.name,
          category: args.category,
          canonicalUnit: args.canonicalUnit,
          storage: args.storage,
        })
        return jsonContent(view)
      }
      catch (error) {
        if (error instanceof DuplicateIngredientNameError) {
          return { content: [{ type: 'text' as const, text: error.message }], isError: true }
        }
        throw error
      }
    },
  )
}
