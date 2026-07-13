import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LabelPhotoStorageError } from '../../domain/errors/label-photo-storage.error'
import type { ILabelPhotoStorage, StoredPhotoInput } from '../../domain/ports/label-photo-storage.port'
import { MEDIA_TYPE_TO_EXT } from './label-photo-key'

/** Base path of the serving route; the key is appended to build `photoUrl`. */
const SERVE_PREFIX = '/api/cave/label-photos'

/** Max decoded image size (≈ 5 MB), aligned with the DTO base64 bound. */
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Persists wine-label photos on the local filesystem under
 * `<dir>/<householdId>/<uuid>.<ext>` and returns the served URL. Keys are
 * opaque UUIDs scoped to the household; the extension mirrors the media type.
 */
export class FilesystemLabelPhotoStorage implements ILabelPhotoStorage {
  constructor(
    private readonly baseDir: string,
    private readonly idGenerator: () => string = randomUUID,
  ) {}

  async store(input: StoredPhotoInput): Promise<{ url: string }> {
    const ext = MEDIA_TYPE_TO_EXT[input.mediaType]
    if (!ext) {
      throw new LabelPhotoStorageError(`Type d'image non supporté : ${input.mediaType}.`)
    }

    let bytes: Buffer
    try {
      bytes = Buffer.from(input.data, 'base64')
    }
    catch {
      throw new LabelPhotoStorageError('Image illisible (base64 invalide).')
    }
    if (bytes.length === 0) {
      throw new LabelPhotoStorageError('Image vide.')
    }
    if (bytes.length > MAX_BYTES) {
      throw new LabelPhotoStorageError('Image trop volumineuse.')
    }

    const dir = join(this.baseDir, input.householdId)
    const filename = `${this.idGenerator()}.${ext}`
    try {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, filename), bytes)
    }
    catch (e) {
      throw new LabelPhotoStorageError(`Écriture de la photo impossible : ${(e as Error).message}`)
    }

    return { url: `${SERVE_PREFIX}/${input.householdId}/${filename}` }
  }
}
