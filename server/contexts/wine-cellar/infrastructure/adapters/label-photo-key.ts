/**
 * Wine-label storage keys are `<householdId>/<uuid>.<ext>` with ext ∈
 * jpg|png|webp. Validating the shape defends the serving route against
 * path-traversal: only keys matching this pattern resolve to a file, so `..`
 * or absolute paths are rejected before any filesystem access.
 */
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
export const LABEL_KEY_PATTERN = new RegExp(`^${UUID}/${UUID}\\.(jpg|png|webp)$`)

export const MEDIA_TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const EXT_TO_MEDIA_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** True when `key` is a safe `<householdId>/<uuid>.<ext>` storage key. */
export function isValidLabelKey(key: string): boolean {
  return LABEL_KEY_PATTERN.test(key)
}
