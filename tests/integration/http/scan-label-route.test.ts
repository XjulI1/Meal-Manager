import { describe, expect, it, vi } from 'vitest'
import scanLabelHandler from '../../../server/api/cave/scan-label.post'
import { WineLabelScanError } from '../../../server/contexts/wine-cellar/domain/errors/wine-label-scan.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com', aiEnabled: true } }
const HH = 'hh-1'

function buildContainer(opts: { aiEnabled?: boolean } = {}) {
  const aiEnabled = opts.aiEnabled ?? true
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Famille', inviteCode: 'X', memberCount: 1 }) },
    getUserAiAccess: { execute: vi.fn().mockResolvedValue({ aiEnabled }) },
    scanWineLabel: { execute: vi.fn() },
  }
}

const validBody = { images: [{ mediaType: 'image/jpeg', data: 'AAAA' }] }

describe('POST /api/cave/scan-label', () => {
  it('returns 401 when there is no session', async () => {
    const event = makeEvent({ container: buildContainer(), body: validBody })
    await expect((scanLabelHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 403 when AI is disabled (before any model call)', async () => {
    const container = buildContainer({ aiEnabled: false })
    const event = makeEvent({ session, container, body: validBody })
    await expect((scanLabelHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(container.scanWineLabel.execute).not.toHaveBeenCalled()
  })

  it('returns the extracted draft when AI is enabled', async () => {
    const draft = { name: 'Saint-Amour', color: 'rouge', suggestedBottleCount: 1 }
    const container = buildContainer()
    container.scanWineLabel.execute.mockResolvedValue(draft)
    const event = makeEvent({ session, container, body: validBody })

    const result = await (scanLabelHandler as any)(event)

    expect(result).toEqual(draft)
    expect(container.scanWineLabel.execute).toHaveBeenCalledWith({ householdId: HH, images: validBody.images })
  })

  it('maps a WineLabelScanError to 400', async () => {
    const container = buildContainer()
    container.scanWineLabel.execute.mockRejectedValue(new WineLabelScanError('illisible'))
    const event = makeEvent({ session, container, body: validBody })
    await expect((scanLabelHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 400 when no image is provided (without any model call)', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, body: { images: [] } })
    await expect((scanLabelHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(container.scanWineLabel.execute).not.toHaveBeenCalled()
  })

  it('returns 400 on an unsupported media type', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, body: { images: [{ mediaType: 'application/pdf', data: 'AAAA' }] } })
    await expect((scanLabelHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(container.scanWineLabel.execute).not.toHaveBeenCalled()
  })

  it('returns 400 when there are too many images', async () => {
    const container = buildContainer()
    const images = Array.from({ length: 3 }, () => ({ mediaType: 'image/png', data: 'AAAA' }))
    const event = makeEvent({ session, container, body: { images } })
    await expect((scanLabelHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(container.scanWineLabel.execute).not.toHaveBeenCalled()
  })
})
