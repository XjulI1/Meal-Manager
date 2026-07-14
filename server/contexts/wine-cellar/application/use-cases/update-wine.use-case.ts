import type { WineView } from '../../../../../shared/dto/wine-cellar'
import { WineNotFoundError } from '../../domain/errors/wine-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ILabelPhotoStorage } from '../../domain/ports/label-photo-storage.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { mergeWineAttributes, resolveLabelPhoto, type LabelPhotoInput, type WinePatch } from '../wine-attributes'
import { toWineView } from '../wine-cellar-views'

export interface UpdateWineInput extends WinePatch {
  householdId: string
  id: string
  /** Optional label photo to persist; replaces `photoUrl` with the served URL. */
  labelPhoto?: LabelPhotoInput
}

export class UpdateWineUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
    private readonly photoStorage: ILabelPhotoStorage,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateWineInput): Promise<WineView> {
    const wine = await this.wines.findById(input.id, input.householdId)
    if (!wine) throw new WineNotFoundError(input.id)

    const photoUrl = await resolveLabelPhoto(this.photoStorage, input.householdId, input, input.photoUrl)
    const updated = wine.withAttributes(mergeWineAttributes(wine, { ...input, photoUrl }), this.clock())
    await this.wines.update(updated)

    const bottleCount = (await this.bottles.listByWine(wine.id, input.householdId)).length
    return toWineView(updated, bottleCount)
  }
}
