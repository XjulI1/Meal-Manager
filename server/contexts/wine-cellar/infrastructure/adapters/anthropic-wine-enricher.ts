import Anthropic from '@anthropic-ai/sdk'
import { WineEnrichmentSchema } from '../../../../../shared/dto/wine-cellar'
import { WineEnrichmentError } from '../../domain/errors/wine-enrichment.error'
import type {
  IWineEnricher,
  WineEnrichmentResult,
  WineFacts,
} from '../../domain/ports/wine-enricher.port'
import type { AnthropicEffort } from '../anthropic-config'
import { ENRICH_WINE_TOOLS } from './wine-enrich-tool'

const MAX_TOKENS = 2048
/** Cap on model turns: the model may search (server-side) then must call the
 *  `enrich_wine` tool. A couple of extra turns tolerate a stray text reply. */
const MAX_TURNS = 3

const SYSTEM
  = 'Tu es sommelier. À partir de ce que l\'on sait d\'un vin, recherche sur le web '
    + 'des informations fiables sur cette cuvée : la fenêtre de garde (années d\'apogée), '
    + 'son profil aromatique et les accords mets/vin. Utilise l\'outil web_search autant '
    + 'que nécessaire, puis appelle l\'outil enrich_wine pour renvoyer le résultat structuré. '
    + 'N\'invente rien : si une information reste incertaine, ne renseigne pas le champ correspondant.'

/**
 * Enriches a wine using the Anthropic API with server-side web search. The
 * model researches the cuvée then emits the `enrich_wine` tool; its input is
 * validated against `WineEnrichmentSchema`. A field the research cannot
 * establish is omitted (kept unchanged by the use case).
 */
export class AnthropicWineEnricher implements IWineEnricher {
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: AnthropicEffort,
  ) {
    this.client = new Anthropic({ apiKey })
  }

  async enrich(facts: WineFacts): Promise<WineEnrichmentResult> {
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: this.describeWine(facts) },
    ]

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      let message: Anthropic.Messages.Message
      try {
        message = await this.client.messages.create({
          model: this.model,
          max_tokens: MAX_TOKENS,
          output_config: { effort: this.effort },
          system: SYSTEM,
          tools: ENRICH_WINE_TOOLS,
          tool_choice: { type: 'auto' },
          messages,
        })
      }
      catch (e) {
        throw new WineEnrichmentError(`L'enrichissement du vin a échoué : ${(e as Error).message}`)
      }

      for (const block of message.content) {
        if (block.type === 'tool_use' && block.name === 'enrich_wine') {
          const parsed = WineEnrichmentSchema.safeParse(block.input)
          if (parsed.success) return parsed.data
          throw new WineEnrichmentError("La réponse de l'IA n'a pas pu être interprétée.")
        }
      }

      // No structured output yet — feed the turn back and nudge toward the tool.
      messages.push({ role: 'assistant', content: message.content })
      messages.push({
        role: 'user',
        content: 'Appelle maintenant l\'outil enrich_wine avec les informations trouvées.',
      })
    }

    throw new WineEnrichmentError("L'IA n'a pas renvoyé d'informations exploitables.")
  }

  private describeWine(facts: WineFacts): string {
    const lines = [
      `Nom : ${facts.name}`,
      `Robe : ${facts.color}`,
    ]
    if (facts.domain) lines.push(`Domaine/producteur : ${facts.domain}`)
    if (facts.appellation) lines.push(`Appellation : ${facts.appellation}`)
    if (facts.region) lines.push(`Région : ${facts.region}`)
    if (facts.country) lines.push(`Pays : ${facts.country}`)
    if (facts.vintage) lines.push(`Millésime : ${facts.vintage}`)
    return `Voici ce que l'on sait du vin :\n${lines.join('\n')}`
  }
}
