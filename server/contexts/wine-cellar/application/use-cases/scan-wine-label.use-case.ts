import type {
  IWineLabelExtractor,
  WineLabelDraftContent,
  WineLabelImageInput,
} from '../../domain/ports/wine-label-extractor.port'

export interface ScanWineLabelInput {
  householdId: string
  images: ReadonlyArray<WineLabelImageInput>
}

/**
 * Extracts a wine draft from one or more label photos (never persisted).
 * Delegates to the IWineLabelExtractor port; the adapter calls the Anthropic
 * vision API. A WineLabelScanError surfaces as HTTP 400 at the transport layer.
 * The draft then pre-fills the existing wine form.
 */
export class ScanWineLabelUseCase {
  constructor(private readonly extractor: IWineLabelExtractor) {}

  async execute(input: ScanWineLabelInput): Promise<WineLabelDraftContent> {
    return this.extractor.extractFromPhotos(input.images)
  }
}
