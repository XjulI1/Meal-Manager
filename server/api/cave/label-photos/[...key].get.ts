import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { EXT_TO_MEDIA_TYPE, isValidLabelKey } from '../../../contexts/wine-cellar/infrastructure/adapters/label-photo-key'
import { requireHouseholdMember } from '../../../utils/require-household'

/**
 * Serves a persisted wine-label photo. The key is `<householdId>/<uuid>.<ext>`;
 * it is validated (defends against path-traversal) and MUST belong to the
 * caller's household — same-origin `<img>` requests carry the session cookie,
 * so this yields real household isolation on top of the unguessable UUID.
 */
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)

  const key = getRouterParam(event, 'key') ?? ''
  if (!isValidLabelKey(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Photo introuvable.' })
  }
  if (!key.startsWith(`${householdId}/`)) {
    throw createError({ statusCode: 404, statusMessage: 'Photo introuvable.' })
  }

  const baseDir = resolve(useRuntimeConfig().wineLabelDir)
  const filePath = resolve(join(baseDir, key))
  // Belt-and-braces: the resolved path must stay under the storage root.
  if (filePath !== baseDir && !filePath.startsWith(`${baseDir}/`)) {
    throw createError({ statusCode: 404, statusMessage: 'Photo introuvable.' })
  }

  let bytes: Buffer
  try {
    bytes = await readFile(filePath)
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Photo introuvable.' })
  }

  const ext = key.slice(key.lastIndexOf('.') + 1)
  setResponseHeader(event, 'Content-Type', EXT_TO_MEDIA_TYPE[ext] ?? 'application/octet-stream')
  setResponseHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
  return bytes
})
