import { ImportVinotagSchema } from '../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../utils/require-household'
import { handleWineCellarError } from '../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => ImportVinotagSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Fichier d\'import invalide.' })
  }

  if (body.data.filename && !body.data.filename.toLowerCase().endsWith('.xlsx')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Seuls les fichiers Excel (.xlsx) exportés depuis Vinotag sont acceptés.',
    })
  }

  let file: Uint8Array
  try {
    file = new Uint8Array(Buffer.from(body.data.fileBase64, 'base64'))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Contenu de fichier illisible.' })
  }

  try {
    return await event.context.container.importVinotag.execute({ householdId, file })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
