import { WineEnrichmentError } from '../../../../contexts/wine-cellar/domain/errors/wine-enrichment.error'
import { requireAiEnabled } from '../../../../utils/require-ai-enabled'
import { handleWineCellarError } from '../../../../utils/wine-cellar-http'

/**
 * On-demand AI enrichment of a wine (garde window, aromas, food pairings).
 * Scoped to the household and gated by AI access. The result is persisted on
 * the wine. A failed upstream enrichment → 502; an unknown wine → 404.
 */
export default defineEventHandler(async (event) => {
  const { householdId } = await requireAiEnabled(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de vin manquant.' })

  try {
    return await event.context.container.enrichWine.execute({ householdId, id })
  }
  catch (error) {
    if (error instanceof WineEnrichmentError) {
      throw createError({ statusCode: 502, statusMessage: error.message })
    }
    handleWineCellarError(error)
  }
})
