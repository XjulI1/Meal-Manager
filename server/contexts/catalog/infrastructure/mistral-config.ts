/** Mistral model / effort configuration for the recipe AI adapters. */

import type { ReasoningEffort } from '@mistralai/mistralai/models/components'

/**
 * Mirror of `AnthropicEffort` so the env surface and container wiring stay
 * symmetric across providers. Mapped to Mistral's `reasoningEffort` scale via
 * `toReasoningEffort` ('max' has no exact Mistral peer → 'xhigh').
 */
export type MistralEffort = 'low' | 'medium' | 'high' | 'max'

const EFFORTS: readonly MistralEffort[] = ['low', 'medium', 'high', 'max']

/**
 * Defaults (current values) — overridable via environment variables.
 * `mistral-medium-latest` is multimodal (vision), supports function calling and
 * works as the agent model behind the web-search connector — i.e. it covers the
 * exact feature set the Anthropic adapters rely on, with a single model id.
 */
export const DEFAULT_MISTRAL_MODEL = 'mistral-medium-latest'
export const DEFAULT_CHAT_EFFORT: MistralEffort = 'medium'
export const DEFAULT_IMPORT_EFFORT: MistralEffort = 'low'
export const DEFAULT_PHOTO_EFFORT: MistralEffort = 'low'

/** Coerce an env value to a valid effort, falling back when absent/invalid. */
export function parseEffort(value: string | undefined, fallback: MistralEffort): MistralEffort {
  return value && (EFFORTS as readonly string[]).includes(value) ? (value as MistralEffort) : fallback
}

/** Map the shared effort surface onto Mistral's reasoning-effort scale. */
export function toReasoningEffort(effort: MistralEffort): ReasoningEffort {
  return effort === 'max' ? 'xhigh' : effort
}
