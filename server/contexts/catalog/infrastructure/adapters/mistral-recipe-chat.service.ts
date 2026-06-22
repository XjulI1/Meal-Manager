import { Mistral } from '@mistralai/mistralai'
import type { FunctionTool, WebSearchTool } from '@mistralai/mistralai/models/components'
import { RecipeDraftSchema } from '../../../../../shared/dto/recipe-chat'
import type {
  ChatMessage,
  IRecipeChatAssistant,
  RecipeChatEvent,
  RecipeChatSource,
} from '../../domain/ports/recipe-chat-assistant'
import type { RecipeDraft } from '../../domain/ports/recipe-importer'
import type { MistralEffort } from '../mistral-config'
import { toReasoningEffort } from '../mistral-config'

/** Cost guard: bound output tokens per turn (streaming chat). */
const MAX_TOKENS = 3072

// Stable system instructions — byte-identical to the Anthropic adapter so the
// two providers can be compared on equal footing. Do not interpolate per-request data.
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

const PROPOSE_RECIPE_TOOL: FunctionTool = {
  type: 'function',
  function: {
    name: 'propose_recipe',
    description:
      'Émet la recette finale une fois prête. À appeler uniquement quand l\'utilisateur '
      + 'a convergé sur une recette concrète. N\'enregistre rien — le brouillon sera revu '
      + 'dans le formulaire de l\'application.',
    parameters: {
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
  },
}

const WEB_SEARCH_TOOL: WebSearchTool = { type: 'web_search' }

/**
 * Conversational recipe assistant backed by Mistral's Conversations (Agents)
 * API. Mistral exposes web search only as a built-in connector through this API
 * (not via plain chat completions), so we combine the `web_search` connector
 * with the custom `propose_recipe` function tool and stream the turn.
 *
 * Functional twin of `AnthropicRecipeChatService`: streams assistant text,
 * surfaces web sources, and emits a structured RecipeDraft when ready. It never
 * persists anything.
 */
export class MistralRecipeChatService implements IRecipeChatAssistant {
  private readonly client: Mistral

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: MistralEffort,
  ) {
    this.client = new Mistral({ apiKey })
  }

  async *streamTurn(messages: ReadonlyArray<ChatMessage>): AsyncIterable<RecipeChatEvent> {
    const stream = await this.client.beta.conversations.startStream({
      model: this.model,
      store: false,
      instructions: SYSTEM_PROMPT,
      tools: [WEB_SEARCH_TOOL, PROPOSE_RECIPE_TOOL],
      completionArgs: {
        maxTokens: MAX_TOKENS,
        reasoningEffort: toReasoningEffort(this.effort),
      },
      inputs: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const sources: RecipeChatSource[] = []
    const seenSources = new Set<string>()
    // `propose_recipe` arguments may arrive as one or several delta fragments,
    // keyed by tool-call id; concatenate then parse once the stream ends.
    const toolArgs = new Map<string, string>()

    for await (const ev of stream) {
      const data = ev.data
      if (!data || typeof data !== 'object' || !('type' in data)) continue

      if (data.type === 'message.output.delta') {
        const content = data.content
        if (typeof content === 'string') {
          if (content) yield { type: 'text', text: content }
        }
        else if (content.type === 'text') {
          if (content.text) yield { type: 'text', text: content.text }
        }
        else if (content.type === 'tool_reference') {
          if (content.url && !seenSources.has(content.url)) {
            seenSources.add(content.url)
            sources.push({ url: content.url, ...(content.title ? { title: content.title } : {}) })
          }
        }
      }
      else if (data.type === 'function.call.delta' && data.name === 'propose_recipe') {
        toolArgs.set(data.toolCallId, (toolArgs.get(data.toolCallId) ?? '') + data.arguments)
      }
    }

    if (sources.length > 0) yield { type: 'sources', sources }
    const draft = extractDraft(toolArgs)
    if (draft) yield { type: 'draft', draft }
  }
}

function extractDraft(toolArgs: Map<string, string>): RecipeDraft | null {
  for (const raw of toolArgs.values()) {
    let input: unknown
    try {
      input = JSON.parse(raw)
    }
    catch {
      continue
    }
    const parsed = RecipeDraftSchema.safeParse(input)
    if (parsed.success) return parsed.data
  }
  return null
}
