import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LabelPhotoStorageError } from '../../../server/contexts/wine-cellar/domain/errors/label-photo-storage.error'
import { FilesystemLabelPhotoStorage } from '../../../server/contexts/wine-cellar/infrastructure/adapters/filesystem-label-photo-storage'
import { isValidLabelKey } from '../../../server/contexts/wine-cellar/infrastructure/adapters/label-photo-key'

const HH = '11111111-1111-1111-1111-111111111111'
// 1×1 transparent PNG.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('FilesystemLabelPhotoStorage', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wine-labels-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('writes the photo and returns a valid served URL under the household', async () => {
    const storage = new FilesystemLabelPhotoStorage(dir)
    const { url } = await storage.store({ householdId: HH, mediaType: 'image/png', data: PNG_BASE64 })

    const key = url.replace('/api/cave/label-photos/', '')
    expect(isValidLabelKey(key)).toBe(true)
    expect(key.startsWith(`${HH}/`)).toBe(true)

    const files = await readdir(join(dir, HH))
    expect(files).toHaveLength(1)
    const written = await readFile(join(dir, HH, files[0]!))
    expect(written.equals(Buffer.from(PNG_BASE64, 'base64'))).toBe(true)
  })

  it('rejects an unsupported media type without writing', async () => {
    const storage = new FilesystemLabelPhotoStorage(dir)
    await expect(
      storage.store({ householdId: HH, mediaType: 'application/pdf', data: PNG_BASE64 }),
    ).rejects.toBeInstanceOf(LabelPhotoStorageError)
    await expect(readdir(join(dir, HH))).rejects.toThrow()
  })
})
