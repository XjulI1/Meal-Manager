import type {
  IWineLabelExtractor,
  WineLabelDraftContent,
  WineLabelImageInput,
} from '../../../../server/contexts/wine-cellar/domain/ports/wine-label-extractor.port'

/** In-memory fake extractor: returns a fixed draft or throws a fixed error. */
export class FakeWineLabelExtractor implements IWineLabelExtractor {
  lastImages?: ReadonlyArray<WineLabelImageInput>

  constructor(private readonly result: WineLabelDraftContent | Error) {}

  async extractFromPhotos(images: ReadonlyArray<WineLabelImageInput>): Promise<WineLabelDraftContent> {
    this.lastImages = images
    if (this.result instanceof Error) throw this.result
    return this.result
  }
}
