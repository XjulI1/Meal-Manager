import type { Container } from '../../../types/container'

/**
 * Per-request context handed to each tool's handler. The `householdId` is
 * resolved from the authenticated PAT — tools MUST NOT accept it as input.
 */
export interface McpToolContext {
  container: Container
  userId: string
  householdId: string
}

/** Convention: every tool returns a single JSON text content block. */
export function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  }
}
