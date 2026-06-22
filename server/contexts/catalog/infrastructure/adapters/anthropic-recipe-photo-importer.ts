import Anthropic from '@anthropic-ai/sdk'
import { RecipeDraftSchema } from '../../../../../shared/dto/recipe-chat'
import { RecipePhotoImportError } from '../../domain/errors/recipe-photo-import.error'
import type { IRecipePhotoImporter, RecipeImageInput } from '../../domain/ports/recipe-photo-importer'
import type { RecipeDraftContent } from '../../domain/ports/recipe-importer'
import type { AnthropicEffort } from '../anthropic-config'
import { EXTRACT_TOOLS } from './recipe-extract-tool'

const MAX_TOKENS = 2048

const INSTRUCTION
  = 'Voici une ou plusieurs photos d\'une seule et même recette (page de livre, '
    + 'fiche, notes manuscrites). Lis-les ensemble et extrais la recette complète : '
    + 'titre, nombre de portions si indiqué, liste des ingrédients avec leurs '
    + 'quantités, et les étapes de préparation. Si une information est absente des '
    + 'images, ne l\'invente pas.'

/** Anthropic vision media types accepted by the Messages API image block. */
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

/**
 * Imports a recipe from one or more photos using the Anthropic vision API. All
 * images are sent in a single user message and interpreted together as one
 * recipe; Claude is forced to emit the shared `extract_recipe` tool. The result
 * is always a draft (never persisted) and carries no source URL.
 */
export class AnthropicRecipePhotoImporter implements IRecipePhotoImporter {
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: AnthropicEffort,
  ) {
    this.client = new Anthropic({ apiKey })
  }

  async importFromPhotos(images: ReadonlyArray<RecipeImageInput>): Promise<RecipeDraftContent> {
    if (images.length === 0) {
      throw new RecipePhotoImportError('Aucune image fournie.')
    }

    const imageBlocks: Anthropic.Messages.ContentBlockParam[] = images.map((img) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType as ImageMediaType,
        data: img.data,
      },
    }))

    let message: Anthropic.Messages.Message
    try {
      message = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        // Visual reading benefits from more than the URL importer's "low".
        output_config: { effort: this.effort },
        tools: EXTRACT_TOOLS,
        tool_choice: { type: 'tool', name: 'extract_recipe' },
        messages: [
          {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: INSTRUCTION }],
          },
        ],
      })
    }
    catch (e) {
      throw new RecipePhotoImportError(`L'interprétation des photos a échoué : ${(e as Error).message}`)
    }

    for (const block of message.content) {
      if (block.type === 'tool_use' && block.name === 'extract_recipe') {
        const parsed = RecipeDraftSchema.safeParse(block.input)
        if (parsed.success) return parsed.data
      }
    }
    throw new RecipePhotoImportError("Aucune recette exploitable n'a pu être extraite des photos.")
  }
}
