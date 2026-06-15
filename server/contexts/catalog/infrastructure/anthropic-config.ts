/** Anthropic model / effort configuration for the recipe AI adapters. */

export type AnthropicEffort = 'low' | 'medium' | 'high' | 'max'

const EFFORTS: readonly AnthropicEffort[] = ['low', 'medium', 'high', 'max']

/** Defaults (current values) — overridable via environment variables. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6'
export const DEFAULT_CHAT_EFFORT: AnthropicEffort = 'medium'
export const DEFAULT_IMPORT_EFFORT: AnthropicEffort = 'low'
export const DEFAULT_PHOTO_EFFORT: AnthropicEffort = 'low'

/** Coerce an env value to a valid effort, falling back when absent/invalid. */
export function parseEffort(value: string | undefined, fallback: AnthropicEffort): AnthropicEffort {
  return value && (EFFORTS as readonly string[]).includes(value) ? (value as AnthropicEffort) : fallback
}
