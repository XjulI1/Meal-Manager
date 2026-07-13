import { describe, expect, it } from 'vitest'
import { WineLabelDraftSchema } from '../../../shared/dto/wine-label'
import { normalizeWineLabelPayload } from '../../../server/contexts/wine-cellar/infrastructure/adapters/wine-label-normalize'

describe('normalizeWineLabelPayload', () => {
  it('keeps an in-list region untouched', () => {
    const out = normalizeWineLabelPayload({ region: 'beaujolais', color: 'rouge' })
    expect(out.region).toBe('beaujolais')
  })

  it('maps an out-of-list region to autre so the draft still validates', () => {
    const out = normalizeWineLabelPayload({ name: 'Chianti', region: 'toscane', color: 'rouge' })
    expect(out.region).toBe('autre')
    const parsed = WineLabelDraftSchema.safeParse(out)
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.region).toBe('autre')
  })

  it('leaves an absent region absent (never invents one)', () => {
    const out = normalizeWineLabelPayload({ name: 'Sancerre', color: 'blanc' })
    expect(out.region).toBeUndefined()
  })
})
