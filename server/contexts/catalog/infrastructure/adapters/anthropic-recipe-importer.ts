import Anthropic from '@anthropic-ai/sdk'
import { RecipeDraftSchema } from '../../../../../shared/dto/recipe-chat'
import { RecipeImportError } from '../../domain/errors/recipe-import.error'
import type { IRecipeImporter, RecipeDraftContent } from '../../domain/ports/recipe-importer'
import type { AnthropicEffort } from '../anthropic-config'
import { parseRecipeJsonLd } from '../recipe-json-ld'
import { EXTRACT_TOOLS } from './recipe-extract-tool'

const MAX_TOKENS = 2048
const MAX_HTML_CHARS = 60_000

/**
 * Imports a recipe from a URL. First tries structured data (schema.org Recipe
 * JSON-LD) via the pure parser; falls back to Claude extraction when the page
 * has no usable structured data. The result is always a draft (never persisted)
 * and carries the source URL.
 */
export class AnthropicRecipeImporter implements IRecipeImporter {
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: AnthropicEffort,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.client = new Anthropic({ apiKey })
  }

  async importFromUrl(url: string): Promise<RecipeDraftContent> {
    const html = await this.fetchHtml(url)
    const fromJsonLd = parseRecipeJsonLd(html)
    if (fromJsonLd) return { ...fromJsonLd, sourceUrl: url }
    const extracted = await this.extractWithClaude(html, url)
    return { ...extracted, sourceUrl: url }
  }

  private async fetchHtml(url: string): Promise<string> {
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        headers: { 'user-agent': 'MealManager/0.1 (+recipe-import)' },
      })
    }
    catch (e) {
      throw new RecipeImportError(`Impossible de joindre l'URL : ${(e as Error).message}`)
    }
    if (!res.ok) throw new RecipeImportError(`La page a répondu ${res.status}.`)
    return await res.text()
  }

  private async extractWithClaude(html: string, url: string): Promise<RecipeDraftContent> {
    const text = stripToText(html).slice(0, MAX_HTML_CHARS)
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      // Mechanical extraction — keep the effort low by default for cost/speed.
      output_config: { effort: this.effort },
      tools: EXTRACT_TOOLS,
      tool_choice: { type: 'tool', name: 'extract_recipe' },
      messages: [
        {
          role: 'user',
          content: `Extrais la recette de cette page (${url}). Contenu de la page :\n\n${text}`,
        },
      ],
    })
    for (const block of message.content) {
      if (block.type === 'tool_use' && block.name === 'extract_recipe') {
        const parsed = RecipeDraftSchema.safeParse(block.input)
        if (parsed.success) return parsed.data
      }
    }
    throw new RecipeImportError("Aucune recette exploitable n'a pu être extraite de cette page.")
  }
}

function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
