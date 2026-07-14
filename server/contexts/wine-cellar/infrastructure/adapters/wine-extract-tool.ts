import type Anthropic from '@anthropic-ai/sdk'
import { WINE_REGIONS } from '../../../../../shared/dto/wine-cellar'

/**
 * `extract_wine` tool definition used by the label extractor to coerce Claude
 * into emitting structured wine attributes. The output is validated against
 * `WineLabelDraftSchema`; region/color are constrained to the closed lists.
 */
export const EXTRACT_WINE_TOOL: Anthropic.Messages.Tool = {
  name: 'extract_wine',
  description: 'Renvoie les attributs structurés du vin lus sur l\'étiquette.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nom du vin / cuvée' },
      domain: { type: 'string', description: 'Domaine ou producteur' },
      country: { type: 'string', description: 'Pays' },
      region: {
        type: 'string',
        enum: [...WINE_REGIONS],
        description: 'Région viticole (liste fermée) ou "autre" si hors-liste/inconnue',
      },
      appellation: { type: 'string', description: 'Appellation (texte libre)' },
      vintage: { type: 'integer', description: 'Millésime (année)' },
      color: {
        type: 'string',
        enum: ['rouge', 'blanc', 'rose', 'effervescent'],
        description: 'Robe du vin',
      },
      gardeMin: { type: 'integer', description: 'Début de la fenêtre de garde (année)' },
      gardeMax: { type: 'integer', description: 'Fin de la fenêtre de garde (année)' },
    },
    required: [],
  },
}

export const EXTRACT_WINE_TOOLS: Anthropic.Messages.ToolUnion[] = [EXTRACT_WINE_TOOL]
