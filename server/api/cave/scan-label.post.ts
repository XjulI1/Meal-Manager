import { ScanWineLabelSchema } from '../../../shared/dto/wine-label'
import { WineLabelScanError } from '../../contexts/wine-cellar/domain/errors/wine-label-scan.error'
import { requireAiEnabled } from '../../utils/require-ai-enabled'

/**
 * Extracts a wine draft from one or more label photos (never persisted).
 * Scoped to the household and gated by AI access. Images are validated at the
 * boundary (count, media type, size) — an invalid payload → 400 with no
 * Anthropic call. A failed extraction → 400. The draft pre-fills the wine form.
 */
export default defineEventHandler(async (event) => {
  const { householdId } = await requireAiEnabled(event)

  const body = await readValidatedBody(event, (raw) => ScanWineLabelSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Photo d\'étiquette invalide.' })
  }

  try {
    return await event.context.container.scanWineLabel.execute({
      householdId,
      images: body.data.images,
    })
  }
  catch (error) {
    if (error instanceof WineLabelScanError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
