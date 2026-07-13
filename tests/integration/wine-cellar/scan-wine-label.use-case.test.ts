import { describe, expect, it } from 'vitest'
import { ScanWineLabelUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/scan-wine-label.use-case'
import { WineLabelScanError } from '../../../server/contexts/wine-cellar/domain/errors/wine-label-scan.error'
import type { WineLabelDraftContent } from '../../../server/contexts/wine-cellar/domain/ports/wine-label-extractor.port'
import { FakeWineLabelExtractor } from './in-memory/fake-wine-label-extractor'

describe('ScanWineLabelUseCase', () => {
  it('returns the draft produced by the extractor and persists nothing', async () => {
    const draft: WineLabelDraftContent = {
      name: 'Saint-Amour',
      color: 'rouge',
      region: 'beaujolais',
      vintage: 2023,
      suggestedBottleCount: 1,
    }
    const extractor = new FakeWineLabelExtractor(draft)
    const useCase = new ScanWineLabelUseCase(extractor)
    const images = [{ mediaType: 'image/jpeg', data: 'AAAA' }]

    const result = await useCase.execute({ householdId: 'hh-1', images })

    expect(result).toEqual(draft)
    expect(extractor.lastImages).toEqual(images)
  })

  it('propagates a WineLabelScanError when extraction fails', async () => {
    const useCase = new ScanWineLabelUseCase(new FakeWineLabelExtractor(new WineLabelScanError('illisible')))
    await expect(
      useCase.execute({ householdId: 'hh-1', images: [{ mediaType: 'image/png', data: 'BBBB' }] }),
    ).rejects.toBeInstanceOf(WineLabelScanError)
  })
})
