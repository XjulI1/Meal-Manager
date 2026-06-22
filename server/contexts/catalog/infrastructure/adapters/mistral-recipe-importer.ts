import { Mistral } from '@mistralai/mistralai'
import { RecipeDraftSchema } from '../../../../../shared/dto/recipe-chat'
import { RecipeImportError } from '../../domain/errors/recipe-import.error'
import type { IRecipeImporter, RecipeDraft } from '../../domain/ports/recipe-importer'
import type { MistralEffort } from '../mistral-config'
import { toReasoningEffort } from '../mistral-config'
import { parseRecipeJsonLd } from '../recipe-json-ld'
import { EXTRACT_TOOL_CHOICE, EXTRACT_TOOLS } from './mistral-recipe-extract-tool'

const MAX_TOKENS = 2048
const MAX_HTML_CHARS = 60_000

/**
 * Imports a recipe from a URL using Mistral. First tries structured data
 * (schema.org Recipe JSON-LD) via the pure parser; falls back to model
 * extraction when the page has no usable structured data. The result is always
 * a draft (never persisted) and carries the source URL.
 *
 * Functional twin of `AnthropicRecipeImporter`.
 */
export class MistralRecipeImporter implements IRecipeImporter {
  private readonly client: Mistral

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: MistralEffort,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.client = new Mistral({ apiKey })
  }

  async importFromUrl(url: string): Promise<RecipeDraft> {
    const html = await this.fetchHtml(url)
    const fromJsonLd = parseRecipeJsonLd(html)
    if (fromJsonLd) return { ...fromJsonLd, sourceUrl: url }
    const extracted = await this.extractWithMistral(html, url)
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

  private async extractWithMistral(html: string, url: string): Promise<RecipeDraft> {
    const text = stripToText(html).slice(0, MAX_HTML_CHARS)
    const res = await this.client.chat.complete({
      model: this.model,
      maxTokens: MAX_TOKENS,
      // Mechanical extraction — keep the effort low by default for cost/speed.
      reasoningEffort: toReasoningEffort(this.effort),
      tools: EXTRACT_TOOLS,
      toolChoice: EXTRACT_TOOL_CHOICE,
      messages: [
        {
          role: 'user',
          content: `Extrais la recette de cette page (${url}). Contenu de la page :\n\n${text}`,
        },
      ],
    })
    const draft = extractDraftFromToolCalls(res)
    if (draft) return draft
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

/** Pull the first valid `extract_recipe` tool call out of a chat completion. */
export function extractDraftFromToolCalls(res: { choices?: Array<{ message?: { toolCalls?: Array<{ function: { name: string, arguments: string | { [k: string]: unknown } } }> | null } }> }): RecipeDraft | null {
  for (const choice of res.choices ?? []) {
    for (const call of choice.message?.toolCalls ?? []) {
      if (call.function.name !== 'extract_recipe') continue
      const args = call.function.arguments
      const input = typeof args === 'string' ? safeJsonParse(args) : args
      const parsed = RecipeDraftSchema.safeParse(input)
      if (parsed.success) return parsed.data
    }
  }
  return null
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s)
  }
  catch {
    return null
  }
}
