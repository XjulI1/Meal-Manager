import { InvalidQuantityError } from '../../shared/units/quantity'
import { InvalidRowCapacityError } from '../contexts/wine-cellar/domain/entities/row.entity'
import { BottleAlreadyExitedError } from '../contexts/wine-cellar/domain/errors/bottle-already-exited.error'
import { BottleNotFoundError } from '../contexts/wine-cellar/domain/errors/bottle-not-found.error'
import { CapacityBelowOccupancyError } from '../contexts/wine-cellar/domain/errors/capacity-below-occupancy.error'
import { CellarNotFoundError } from '../contexts/wine-cellar/domain/errors/cellar-not-found.error'
import { IncoherentGardeWindowError } from '../contexts/wine-cellar/domain/errors/incoherent-garde-window.error'
import { LabelPhotoStorageError } from '../contexts/wine-cellar/domain/errors/label-photo-storage.error'
import { RowNotEmptyError } from '../contexts/wine-cellar/domain/errors/row-not-empty.error'
import { RowNotFoundError } from '../contexts/wine-cellar/domain/errors/row-not-found.error'
import { ShelfNotEmptyError } from '../contexts/wine-cellar/domain/errors/shelf-not-empty.error'
import { ShelfNotFoundError } from '../contexts/wine-cellar/domain/errors/shelf-not-found.error'
import { SlotOccupiedError } from '../contexts/wine-cellar/domain/errors/slot-occupied.error'
import { SlotOutOfRangeError } from '../contexts/wine-cellar/domain/errors/slot-out-of-range.error'
import { WineImportError } from '../contexts/wine-cellar/domain/errors/wine-import.error'
import { WineNotFoundError } from '../contexts/wine-cellar/domain/errors/wine-not-found.error'
import { InvalidWineColorError } from '../contexts/wine-cellar/domain/value-objects/wine-color.vo'
import { InvalidWineRegionError } from '../contexts/wine-cellar/domain/value-objects/wine-region.vo'
import { InvalidSlotPositionError } from '../contexts/wine-cellar/domain/value-objects/slot-position.vo'

const NOT_FOUND = [
  CellarNotFoundError,
  ShelfNotFoundError,
  RowNotFoundError,
  WineNotFoundError,
  BottleNotFoundError,
] as const

const CONFLICT = [
  ShelfNotEmptyError,
  RowNotEmptyError,
  CapacityBelowOccupancyError,
  SlotOccupiedError,
  BottleAlreadyExitedError,
] as const

const BAD_REQUEST = [
  SlotOutOfRangeError,
  IncoherentGardeWindowError,
  InvalidWineColorError,
  InvalidWineRegionError,
  InvalidSlotPositionError,
  InvalidRowCapacityError,
  WineImportError,
  LabelPhotoStorageError,
  InvalidQuantityError,
] as const

/**
 * Maps a wine-cellar domain error to an HTTP error and throws it. Unknown
 * errors are re-thrown untouched (surface as 500). Always throws.
 */
export function handleWineCellarError(error: unknown): never {
  const message = error instanceof Error ? error.message : 'Erreur cave à vin.'
  if (NOT_FOUND.some((E) => error instanceof E)) {
    throw createError({ statusCode: 404, statusMessage: message })
  }
  if (CONFLICT.some((E) => error instanceof E)) {
    throw createError({ statusCode: 409, statusMessage: message })
  }
  if (BAD_REQUEST.some((E) => error instanceof E)) {
    throw createError({ statusCode: 400, statusMessage: message })
  }
  throw error
}
