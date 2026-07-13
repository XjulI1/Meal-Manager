import { randomUUID } from 'node:crypto'
import type { WineView } from '../../../../../shared/dto/wine-cellar'
import { Wine } from '../../domain/entities/wine.entity'
import type { ILabelPhotoStorage } from '../../domain/ports/label-photo-storage.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { createWineAttributes, resolveLabelPhoto, type LabelPhotoInput, type WineInput } from '../wine-attributes'
import { toWineView } from '../wine-cellar-views'

export interface CreateWineInput extends WineInput {
  householdId: string
  /** Optional label photo to persist; sets `photoUrl` to the served URL. */
  labelPhoto?: LabelPhotoInput
}

export class CreateWineUseCase {
  constructor(
    private readonly wines: IWineRepository,
    private readonly photoStorage: ILabelPhotoStorage,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateWineInput): Promise<WineView> {
    const photoUrl = await resolveLabelPhoto(this.photoStorage, input.householdId, input, input.photoUrl)
    const wine = Wine.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      attributes: createWineAttributes({ ...input, photoUrl }),
      now: this.clock(),
    })
    await this.wines.create(wine)
    return toWineView(wine, 0)
  }
}
