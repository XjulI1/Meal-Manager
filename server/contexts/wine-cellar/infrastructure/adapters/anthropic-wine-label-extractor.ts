import Anthropic from '@anthropic-ai/sdk'
import { WineLabelDraftSchema } from '../../../../../shared/dto/wine-label'
import { WineLabelScanError } from '../../domain/errors/wine-label-scan.error'
import type {
  IWineLabelExtractor,
  WineLabelDraftContent,
  WineLabelImageInput,
} from '../../domain/ports/wine-label-extractor.port'
import type { AnthropicEffort } from '../anthropic-config'
import { EXTRACT_WINE_TOOLS } from './wine-extract-tool'
import { normalizeWineLabelPayload } from './wine-label-normalize'

const MAX_TOKENS = 1024

const INSTRUCTION
  = 'Voici une ou plusieurs photos d\'une seule et même étiquette de vin '
    + '(recto/verso). Lis-les ensemble et extrais les attributs du vin : nom, '
    + 'domaine/producteur, pays, région viticole, appellation, millésime, robe, '
    + 'et fenêtre de garde si indiquée. La région DOIT être une valeur de la '
    + 'liste fournie ou « autre ». N\'invente aucune information : si un champ '
    + 'n\'est pas lisible sur l\'étiquette, ne le renvoie pas.'

/** Anthropic vision media types accepted by the Messages API image block. */
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

/**
 * Extracts a wine's attributes from one or more label photos using the
 * Anthropic vision API. All images are sent in a single user message and
 * interpreted together; Claude is forced to emit the `extract_wine` tool. The
 * result is always a draft (never persisted).
 */
export class AnthropicWineLabelExtractor implements IWineLabelExtractor {
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: AnthropicEffort,
  ) {
    this.client = new Anthropic({ apiKey })
  }

  async extractFromPhotos(images: ReadonlyArray<WineLabelImageInput>): Promise<WineLabelDraftContent> {
    if (images.length === 0) {
      throw new WineLabelScanError('Aucune image fournie.')
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
        output_config: { effort: this.effort },
        tools: EXTRACT_WINE_TOOLS,
        tool_choice: { type: 'tool', name: 'extract_wine' },
        messages: [
          {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: INSTRUCTION }],
          },
        ],
      })
    }
    catch (e) {
      throw new WineLabelScanError(`L'interprétation de l'étiquette a échoué : ${(e as Error).message}`)
    }

    for (const block of message.content) {
      if (block.type === 'tool_use' && block.name === 'extract_wine') {
        // Defensive normalization before Zod: map an out-of-list region to
        // `autre` so a valid draft is not rejected wholesale.
        const raw = normalizeWineLabelPayload(block.input as Record<string, unknown>)
        const parsed = WineLabelDraftSchema.safeParse(raw)
        if (parsed.success) return parsed.data
      }
    }
    throw new WineLabelScanError("Aucun vin exploitable n'a pu être extrait de l'étiquette.")
  }
}
