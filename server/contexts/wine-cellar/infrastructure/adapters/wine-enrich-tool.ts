import type Anthropic from '@anthropic-ai/sdk'

/**
 * `enrich_wine` tool: the terminal structured output of the enrichment. The
 * model is expected to call it once it has gathered enough from web search.
 * Every field is optional — an unknown field is omitted (never invented) and
 * the existing value on the wine is kept. `gardeMin`/`gardeMax` are apogée
 * years. The output is validated against `WineEnrichmentSchema`.
 */
export const ENRICH_WINE_TOOL: Anthropic.Messages.Tool = {
  name: 'enrich_wine',
  description:
    'Renvoie les informations structurées trouvées sur le vin : fenêtre de garde '
    + '(années d\'apogée), profil aromatique et accords mets/vin. N\'inclure un champ '
    + 'que si l\'information est fiable ; omettre sinon.',
  input_schema: {
    type: 'object',
    properties: {
      gardeMin: { type: 'integer', description: 'Année de début de l\'apogée (à partir de quand boire)' },
      gardeMax: { type: 'integer', description: 'Année de fin de l\'apogée (jusqu\'à quand boire)' },
      aromas: {
        type: 'string',
        description: 'Profil aromatique en texte libre (ex. « fruits rouges, épices, vanille »)',
      },
      foodPairings: {
        type: 'string',
        description: 'Accords mets/vin en texte libre (ex. « viandes rouges grillées, fromages affinés »)',
      },
    },
    required: [],
  },
}

/** Server-side web search tool so the model grounds its answer on real sources. */
export const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5,
}

export const ENRICH_WINE_TOOLS: Anthropic.Messages.ToolUnion[] = [WEB_SEARCH_TOOL, ENRICH_WINE_TOOL]
