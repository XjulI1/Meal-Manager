import type { ILabelPhotoStorage, StoredPhotoInput } from '../../../../server/contexts/wine-cellar/domain/ports/label-photo-storage.port'

/**
 * In-memory fake storage: records what it was asked to store and returns a
 * deterministic URL, without touching the filesystem.
 */
export class FakeLabelPhotoStorage implements ILabelPhotoStorage {
  readonly stored: StoredPhotoInput[] = []

  constructor(private readonly urlFor: (input: StoredPhotoInput, index: number) => string
    = (input, i) => `/api/cave/label-photos/${input.householdId}/photo-${i}.jpg`) {}

  async store(input: StoredPhotoInput): Promise<{ url: string }> {
    const url = this.urlFor(input, this.stored.length)
    this.stored.push(input)
    return { url }
  }
}
