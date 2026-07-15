/** Anthropic effort configuration for the wine-label extractor. Mirrors the
 *  catalog config; kept local to preserve bounded-context isolation. */

export type AnthropicEffort = 'low' | 'medium' | 'high' | 'max'

const EFFORTS: readonly AnthropicEffort[] = ['low', 'medium', 'high', 'max']

/** Visual reading of a label is short; `low` is enough by default. */
export const DEFAULT_LABEL_EFFORT: AnthropicEffort = 'medium'

/** Enrichment reasons over web-search results; `medium` balances cost/quality. */
export const DEFAULT_ENRICH_EFFORT: AnthropicEffort = 'medium'

/** Coerce an env value to a valid effort, falling back when absent/invalid. */
export function parseEffort(value: string | undefined, fallback: AnthropicEffort): AnthropicEffort {
  return value && (EFFORTS as readonly string[]).includes(value)
    ? (value as AnthropicEffort)
    : fallback
}
