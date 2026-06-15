import type Anthropic from '@anthropic-ai/sdk'

/**
 * Shared `extract_recipe` tool definition used by the URL and photo importers to
 * coerce Claude into emitting a structured recipe. Kept in one place so the two
 * adapters cannot drift; the output is validated against `RecipeDraftSchema`.
 */
export const EXTRACT_RECIPE_TOOL: Anthropic.Messages.Tool = {
  name: 'extract_recipe',
  description: 'Renvoie la recette structurée extraite du contenu fourni.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      instructions: { type: 'string' },
      servings: { type: 'integer', minimum: 1 },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: {
              type: 'object',
              properties: { value: { type: 'number' }, unit: { type: 'string' } },
              required: ['value', 'unit'],
            },
            raw: { type: 'string' },
          },
          required: ['name'],
        },
      },
    },
    required: ['title', 'instructions', 'ingredients'],
  },
}

export const EXTRACT_TOOLS: Anthropic.Messages.ToolUnion[] = [EXTRACT_RECIPE_TOOL]
