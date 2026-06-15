import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { RecipeDraftLimitReachedError } from '../../../contexts/catalog/domain/errors/recipe-draft-limit-reached.error'
import { RecipeDraftNotFoundError } from '../../../contexts/catalog/domain/errors/recipe-draft-not-found.error'
import { jsonContent, type McpToolContext } from './context'

/**
 * Recipe-draft tools. `save_recipe_draft` is the first MUTATING MCP tool: an
 * agent persists a work-in-progress recipe for the PAT's household for the user
 * to review and promote later. The `source` is forced to `mcp` server-side and
 * the `householdId` comes from the PAT — neither is accepted from tool input.
 */
const draftIngredientSchema = z.object({
  name: z.string().min(1).max(200).describe('Free-text ingredient name (e.g. "ail", "farine").'),
  quantity: z
    .object({
      value: z.number().nonnegative(),
      unit: z.string().min(1).max(40).describe('Free-text unit (e.g. "g", "gousses", "cuillère à soupe").'),
    })
    .optional(),
  raw: z.string().max(300).optional().describe('Original raw text the line was parsed from.'),
})

export function registerRecipeDraftsTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_save_recipe_draft',
    {
      title: 'Save a recipe draft',
      description:
        'Persists a work-in-progress recipe DRAFT for the household to review later. '
        + 'A draft is permissive: every field is optional and ingredients are free text '
        + '(not yet matched to the catalog). It is NOT a published recipe — the user reviews '
        + 'and promotes it from the web app. Returns the created draft id.',
      inputSchema: {
        title: z.string().max(200).optional(),
        instructions: z.string().max(10_000).optional(),
        servings: z.number().int().min(1).max(50).optional(),
        ingredients: z.array(draftIngredientSchema).max(100).optional(),
        sourceUrl: z.string().url().max(2000).optional(),
      },
    },
    async (args: {
      title?: string
      instructions?: string
      servings?: number
      ingredients?: Array<{ name: string, quantity?: { value: number, unit: string }, raw?: string }>
      sourceUrl?: string
    }) => {
      try {
        const view = await ctx.container.saveRecipeDraft.execute({
          householdId: ctx.householdId,
          source: 'mcp',
          content: {
            title: args.title,
            instructions: args.instructions,
            servings: args.servings,
            ingredients: args.ingredients,
            sourceUrl: args.sourceUrl,
          },
        })
        return jsonContent(view)
      }
      catch (error) {
        if (error instanceof RecipeDraftLimitReachedError) {
          return { content: [{ type: 'text' as const, text: error.message }], isError: true }
        }
        throw error
      }
    },
  )

  server.registerTool(
    'mealmanager_list_recipe_drafts',
    {
      title: 'List recipe drafts',
      description:
        'Returns the household recipe drafts (id, title, source, last updated), '
        + 'most recently updated first.',
      inputSchema: {},
    },
    async () => {
      const drafts = await ctx.container.listRecipeDrafts.execute({ householdId: ctx.householdId })
      return jsonContent(drafts)
    },
  )

  server.registerTool(
    'mealmanager_get_recipe_draft',
    {
      title: 'Get a recipe draft',
      description: 'Returns the full content of a recipe draft (title, instructions, free-text ingredients, source).',
      inputSchema: {
        draftId: z.string().uuid().describe('Draft id (UUID), obtained from `mealmanager_list_recipe_drafts`.'),
      },
    },
    async (args: { draftId: string }) => {
      try {
        const draft = await ctx.container.getRecipeDraftById.execute({
          householdId: ctx.householdId,
          id: args.draftId,
        })
        return jsonContent(draft)
      }
      catch (error) {
        if (error instanceof RecipeDraftNotFoundError) {
          return { content: [{ type: 'text' as const, text: error.message }], isError: true }
        }
        throw error
      }
    },
  )
}
