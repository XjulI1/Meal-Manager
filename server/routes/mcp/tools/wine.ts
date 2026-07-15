import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WineEnrichmentSchema } from '../../../../shared/dto/wine-cellar'
import { WINE_ENRICHMENT_BRIEF } from '../../../contexts/wine-cellar/application/wine-enrichment-brief'
import { WineNotFoundError } from '../../../contexts/wine-cellar/domain/errors/wine-not-found.error'
import { jsonContent, type McpToolContext } from './context'

/**
 * Wine tools. `save_wine_enrichment` is a MUTATING tool: the agent (Claude
 * Desktop) does the web research itself, then persists the values it found —
 * the server performs NO AI call. The `householdId` comes from the PAT and is
 * never accepted from tool input; re-enrichment is allowed.
 */
export function registerWineTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    'mealmanager_list_wines',
    {
      title: 'List wines',
      description:
        'Returns the household wines (id, name, domain, region, vintage, color, isEnriched). '
        + 'Use `enriched: false` to find wines that still need an AI enrichment, '
        + '`enriched: true` for those already enriched.',
      inputSchema: {
        enriched: z
          .boolean()
          .optional()
          .describe('Filter: true = only enriched wines, false = only not-yet-enriched, omit = all.'),
      },
    },
    async (args: { enriched?: boolean }) => {
      const wines = await ctx.container.listWines.execute({ householdId: ctx.householdId })
      const projected = wines
        .map((w) => ({
          id: w.id,
          name: w.name,
          domain: w.domain,
          region: w.region,
          vintage: w.vintage,
          color: w.color,
          isEnriched: w.aiEnrichedAt !== null,
        }))
        .filter((w) => (args.enriched === undefined ? true : w.isEnriched === args.enriched))
      return jsonContent(projected)
    },
  )

  server.registerTool(
    'mealmanager_get_wine',
    {
      title: 'Get a wine',
      description:
        'Returns the full details of a wine (attributes + enrichment fields), '
        + 'including what is already known and useful to research it.',
      inputSchema: {
        wineId: z.string().uuid().describe('Wine id (UUID), obtained from `mealmanager_list_wines`.'),
      },
    },
    async (args: { wineId: string }) => {
      try {
        const { wine } = await ctx.container.getWine.execute({ householdId: ctx.householdId, id: args.wineId })
        return jsonContent(wine)
      }
      catch (error) {
        if (error instanceof WineNotFoundError) {
          return { content: [{ type: 'text' as const, text: error.message }], isError: true }
        }
        throw error
      }
    },
  )

  server.registerTool(
    'mealmanager_save_wine_enrichment',
    {
      title: 'Save a wine enrichment',
      description:
        `${WINE_ENRICHMENT_BRIEF} Recherche sur le web puis appelle cet outil pour `
        + 'enregistrer les valeurs trouvées pour le vin (n\'inclure un champ que si tu l\'as '
        + 'trouvé ; un champ omis laisse la valeur existante inchangée). gardeMin/gardeMax sont '
        + 'des années d\'apogée. Relancer sur un vin déjà enrichi écrase les champs fournis.',
      inputSchema: {
        wineId: z.string().uuid().describe('Wine id (UUID), obtained from `mealmanager_list_wines`.'),
        ...WineEnrichmentSchema.shape,
      },
    },
    async (args: { wineId: string, gardeMin?: number, gardeMax?: number, aromas?: string, foodPairings?: string }) => {
      try {
        const view = await ctx.container.saveWineEnrichment.execute({
          householdId: ctx.householdId,
          id: args.wineId,
          enrichment: {
            gardeMin: args.gardeMin,
            gardeMax: args.gardeMax,
            aromas: args.aromas,
            foodPairings: args.foodPairings,
          },
        })
        return jsonContent(view)
      }
      catch (error) {
        if (error instanceof WineNotFoundError) {
          return { content: [{ type: 'text' as const, text: error.message }], isError: true }
        }
        throw error
      }
    },
  )
}
