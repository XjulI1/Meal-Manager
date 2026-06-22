import type { Tool } from '@mistralai/mistralai/models/components'

/**
 * Mistral port of the shared `extract_recipe` tool. Same JSON schema as the
 * Anthropic version (see `recipe-extract-tool.ts`); used by the URL and photo
 * importers to coerce the model into emitting a structured recipe. Kept in one
 * place so the two adapters cannot drift; output is validated against
 * `RecipeDraftSchema`.
 */
export const EXTRACT_RECIPE_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'extract_recipe',
    description: 'Renvoie la recette structurée extraite du contenu fourni.',
    parameters: {
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
  },
}

export const EXTRACT_TOOLS: Tool[] = [EXTRACT_RECIPE_TOOL]

/** Force the model to emit `extract_recipe` (parity with Anthropic's tool_choice). */
export const EXTRACT_TOOL_CHOICE = { type: 'function', function: { name: 'extract_recipe' } } as const
