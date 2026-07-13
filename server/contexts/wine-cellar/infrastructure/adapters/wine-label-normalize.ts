import { WINE_REGIONS } from '../../../../../shared/dto/wine-cellar'

/**
 * Coerces a raw `extract_wine` tool payload to fit the draft schema without
 * inventing data: an out-of-list `region` is mapped to `autre` (so a valid
 * region label never sinks the whole draft at Zod validation). Other fields are
 * left as-is; the schema drops anything it cannot validate.
 */
export function normalizeWineLabelPayload(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input }
  if (typeof out.region === 'string' && !(WINE_REGIONS as readonly string[]).includes(out.region)) {
    out.region = 'autre'
  }
  return out
}
