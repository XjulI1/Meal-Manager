import { RecipeChatRequestSchema } from '../../../shared/dto/recipe-chat'
import { requireAiEnabled } from '../../utils/require-ai-enabled'

/**
 * Streaming recipe-assistant chat (Server-Sent Events). Each SSE message is a
 * JSON-encoded RecipeChatEvent (`text`, `sources`, `draft`, or `error`).
 * Scoped to the household and gated by AI access (403 when disabled).
 */
export default defineEventHandler(async (event) => {
  const { householdId } = await requireAiEnabled(event)

  const body = await readValidatedBody(event, (raw) => RecipeChatRequestSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chat payload.' })
  }

  const turn = event.context.container.chatRecipe.stream({
    householdId,
    messages: body.data.messages,
  })

  const sse = createEventStream(event)
  // Pump assistant events into the SSE channel; the handler returns immediately.
  void (async () => {
    try {
      for await (const ev of turn) {
        await sse.push(JSON.stringify(ev))
      }
    }
    catch (error) {
      await sse.push(JSON.stringify({ type: 'error', message: (error as Error).message }))
    }
    finally {
      await sse.close()
    }
  })()

  return sse.send()
})
