import Anthropic from '@anthropic-ai/sdk'
import { RecipeDraftSchema } from '../../../../../shared/dto/recipe-chat'
import type {
  ChatMessage,
  IRecipeChatAssistant,
  RecipeChatEvent,
  RecipeChatSource,
} from '../../domain/ports/recipe-chat-assistant'
import type { RecipeDraftContent } from '../../domain/ports/recipe-importer'
import type { AnthropicEffort } from '../anthropic-config'

/** Cost guard: bound output tokens per turn (streaming chat). */
const MAX_TOKENS = 3072

// Stable system prefix — kept byte-identical and cache_control'd so repeated
// turns read it from the prompt cache (D8). Do not interpolate per-request data.
const SYSTEM_PROMPT = [
  'Tu es l\'assistant culinaire de Meal Manager, une application familiale de gestion des repas. ',
  'Tu aides l\'utilisateur à trouver ou construire des recettes, en français.',
  '\n\nRègles :',
  '\n- Tu peux chercher sur le web pour proposer des recettes ; cite tes sources.',
  '\n- Dialogue naturellement ; pose des questions pour préciser le besoin (nombre de portions, contraintes).',
  '\n- Quand une recette est prête et validée par l\'utilisateur, appelle l\'outil `propose_recipe`',
  '\n  avec un titre, des instructions claires, le nombre de portions et la liste des ingrédients',
  '\n  (chaque ingrédient avec son nom et, si possible, une quantité et une unité).',
  '\n- N\'enregistre jamais toi-même : l\'utilisateur validera la recette dans le formulaire.',
  '\n- Reste concis.',
].join('')

const PROPOSE_RECIPE_TOOL: Anthropic.Messages.Tool = {
  name: 'propose_recipe',
  description:
    'Émet la recette finale une fois prête. À appeler uniquement quand l\'utilisateur '
    + 'a convergé sur une recette concrète. N\'enregistre rien — le brouillon sera revu '
    + 'dans le formulaire de l\'application.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Titre de la recette' },
      instructions: { type: 'string', description: 'Instructions (étapes), texte libre' },
      servings: { type: 'integer', description: 'Nombre de portions', minimum: 1 },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nom de l\'ingrédient' },
            quantity: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', description: 'g, ml, unit, cuillère…' },
              },
              required: ['value', 'unit'],
            },
            raw: { type: 'string' },
          },
          required: ['name'],
        },
      },
      sourceUrl: { type: 'string', description: 'URL source si la recette vient du web' },
    },
    required: ['title', 'instructions', 'ingredients'],
  },
}

const CHAT_TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: 'web_search_20260209', name: 'web_search' },
  PROPOSE_RECIPE_TOOL,
]

export class AnthropicRecipeChatService implements IRecipeChatAssistant {
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: AnthropicEffort,
  ) {
    this.client = new Anthropic({ apiKey })
  }

  async *streamTurn(messages: ReadonlyArray<ChatMessage>): AsyncIterable<RecipeChatEvent> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      output_config: { effort: this.effort },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: CHAT_TOOLS,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    // Stream assistant text as it is generated.
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
        yield { type: 'text', text: ev.delta.text }
      }
    }

    // Once complete, surface web sources and the structured draft (if any).
    const final = await stream.finalMessage()
    const sources = extractSources(final.content)
    if (sources.length > 0) yield { type: 'sources', sources }
    const draft = extractDraft(final.content)
    if (draft) yield { type: 'draft', draft }
  }
}

function extractDraft(content: Anthropic.ContentBlock[]): RecipeDraftContent | null {
  for (const block of content) {
    if (block.type === 'tool_use' && block.name === 'propose_recipe') {
      const parsed = RecipeDraftSchema.safeParse(block.input)
      if (parsed.success) return parsed.data
    }
  }
  return null
}

function extractSources(content: Anthropic.ContentBlock[]): RecipeChatSource[] {
  const sources: RecipeChatSource[] = []
  const seen = new Set<string>()
  for (const block of content) {
    if (block.type !== 'web_search_tool_result') continue
    const results = block.content
    if (!Array.isArray(results)) continue
    for (const r of results) {
      if (isRecord(r) && typeof r.url === 'string' && !seen.has(r.url)) {
        seen.add(r.url)
        sources.push({ url: r.url, ...(typeof r.title === 'string' ? { title: r.title } : {}) })
      }
    }
  }
  return sources
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
