import { Mistral } from '@mistralai/mistralai'
import { RecipePhotoImportError } from '../../domain/errors/recipe-photo-import.error'
import type { IRecipePhotoImporter, RecipeImageInput } from '../../domain/ports/recipe-photo-importer'
import type { RecipeDraft } from '../../domain/ports/recipe-importer'
import type { MistralEffort } from '../mistral-config'
import { toReasoningEffort } from '../mistral-config'
import { extractDraftFromToolCalls } from './mistral-recipe-importer'
import { EXTRACT_TOOL_CHOICE, EXTRACT_TOOLS } from './mistral-recipe-extract-tool'

const MAX_TOKENS = 2048

const INSTRUCTION
  = 'Voici une ou plusieurs photos d\'une seule et même recette (page de livre, '
    + 'fiche, notes manuscrites). Lis-les ensemble et extrais la recette complète : '
    + 'titre, nombre de portions si indiqué, liste des ingrédients avec leurs '
    + 'quantités, et les étapes de préparation. Si une information est absente des '
    + 'images, ne l\'invente pas.'

/**
 * Imports a recipe from one or more photos using the Mistral vision API. All
 * images are sent in a single user message (as `image_url` data-URI chunks) and
 * interpreted together as one recipe; the model is forced to emit the shared
 * `extract_recipe` tool. The result is always a draft (never persisted) and
 * carries no source URL.
 *
 * Functional twin of `AnthropicRecipePhotoImporter`.
 */
export class MistralRecipePhotoImporter implements IRecipePhotoImporter {
  private readonly client: Mistral

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: MistralEffort,
  ) {
    this.client = new Mistral({ apiKey })
  }

  async importFromPhotos(images: ReadonlyArray<RecipeImageInput>): Promise<RecipeDraft> {
    if (images.length === 0) {
      throw new RecipePhotoImportError('Aucune image fournie.')
    }

    const imageBlocks = images.map((img) => ({
      type: 'image_url' as const,
      imageUrl: `data:${img.mediaType};base64,${img.data}`,
    }))

    try {
      const res = await this.client.chat.complete({
        model: this.model,
        maxTokens: MAX_TOKENS,
        // Visual reading benefits from more than the URL importer's "low".
        reasoningEffort: toReasoningEffort(this.effort),
        tools: EXTRACT_TOOLS,
        toolChoice: EXTRACT_TOOL_CHOICE,
        messages: [
          {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: INSTRUCTION }],
          },
        ],
      })
      const draft = extractDraftFromToolCalls(res)
      if (draft) return draft
    }
    catch (e) {
      throw new RecipePhotoImportError(`L'interprétation des photos a échoué : ${(e as Error).message}`)
    }
    throw new RecipePhotoImportError("Aucune recette exploitable n'a pu être extraite des photos.")
  }
}
