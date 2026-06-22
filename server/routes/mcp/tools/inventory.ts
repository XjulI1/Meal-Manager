import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StorageLocationSchema } from '../../../../shared/dto/inventory'
import { QuantityInputSchema } from '../../../../shared/dto/units'
import { InvalidIngredientReferenceError } from '../../../contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { jsonContent, type McpToolContext } from './context'

export function registerInventoryTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_list_inventory',
    {
      title: 'List inventory items',
      description:
        'Returns the current inventory of the household (pantry + fridge + freezer). '
        + 'Each item has its ingredient name, category, quantity (in canonical unit: g, ml, or unit) and storage location. '
        + 'Use the optional `location` argument to filter by pantry, fridge or freezer.',
      inputSchema: {
        location: StorageLocationSchema.optional()
          .describe('Filter: "pantry", "fridge" or "freezer". Omit to return all.'),
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

  server.registerTool(
    'mealmanager_add_inventory_item',
    {
      title: 'Add an inventory item',
      description:
        'Adds an item to the household inventory (pantry / fridge / freezer). Upsert semantics: if a line already '
        + 'exists for the same ingredient and location, its quantity is incremented; otherwise a new line is created. '
        + 'The `ingredientId` must reference an existing ingredient — obtain it from `mealmanager_list_ingredients` or '
        + '`mealmanager_create_ingredient`. The quantity unit must be compatible with the ingredient dimension '
        + '(mass → g/kg, volume → ml/cl/l, count → unit). Returns `{ item, created }` where `created` is true for a new '
        + 'line and false when an existing line was incremented.',
      inputSchema: {
        ingredientId: z.string().uuid()
          .describe('Ingredient id (UUID), from `mealmanager_list_ingredients` or `mealmanager_create_ingredient`.'),
        quantity: QuantityInputSchema
          .describe('Quantity to add: { value, unit }. Unit must match the ingredient dimension.'),
        location: StorageLocationSchema.optional()
          .describe('"pantry", "fridge" or "freezer". Omit to use the ingredient default storage.'),
      },
    },
    async (args: {
      ingredientId: string
      quantity: z.infer<typeof QuantityInputSchema>
      location?: z.infer<typeof StorageLocationSchema>
    }) => {
      try {
        const result = await ctx.container.addInventoryItem.execute({
          householdId: ctx.householdId,
          ingredientId: args.ingredientId,
          quantity: args.quantity,
          location: args.location,
        })
        return jsonContent(result)
      }
      catch (error) {
        if (error instanceof InvalidIngredientReferenceError) {
          return { content: [{ type: 'text' as const, text: error.message }], isError: true }
        }
        throw error
      }
    },
  )
}
