/**
 * Stubs Nuxt/Nitro auto-imports for handler tests that exercise routes
 * outside the Nuxt runtime. Imported by `vitest.config.ts` as a setup file.
 */
import { vi } from 'vitest'

interface MockH3Error extends Error {
  statusCode: number
  statusMessage?: string
}

;(globalThis as any).defineEventHandler = (handler: unknown) => handler

;(globalThis as any).readValidatedBody = async (
  event: { _body?: unknown },
  validator: (raw: unknown) => unknown,
) => validator(event._body)

;(globalThis as any).getValidatedQuery = async (
  event: { _query?: unknown },
  validator: (raw: unknown) => unknown,
) => validator(event._query ?? {})

;(globalThis as any).getRouterParam = (event: { _params?: Record<string, string> }, name: string) =>
  event._params?.[name]

;(globalThis as any).setResponseStatus = (event: { _status?: number }, status: number) => {
  event._status = status
}

;(globalThis as any).createError = (opts: { statusCode: number, statusMessage?: string }): MockH3Error => {
  const err = new Error(opts.statusMessage ?? 'Error') as MockH3Error
  err.statusCode = opts.statusCode
  err.statusMessage = opts.statusMessage
  return err
}

;(globalThis as any).setUserSession = vi.fn(async (event: any, data: any) => {
  event._session = data
  return data
})

;(globalThis as any).clearUserSession = vi.fn(async (event: any) => {
  event._session = undefined
  return true
})

;(globalThis as any).getUserSession = vi.fn(async (event: any) => event._session ?? {})

;(globalThis as any).requireUserSession = vi.fn(async (event: any) => {
  if (!event._session?.user) {
    const err = new Error('Unauthorized') as MockH3Error
    err.statusCode = 401
    throw err
  }
  return event._session
})

export interface MockEvent<TBody = unknown> {
  _body?: TBody
  _query?: Record<string, unknown>
  _params?: Record<string, string>
  _session?: { user?: { id: string, email: string } }
  _status?: number
  context: {
    container: any
    user?: { id: string, email: string }
  }
}

export function makeEvent<TBody>(opts: {
  body?: TBody
  query?: Record<string, unknown>
  params?: Record<string, string>
  session?: { user?: { id: string, email: string } }
  container: any
}): MockEvent<TBody> {
  return {
    _body: opts.body,
    _query: opts.query,
    _params: opts.params,
    _session: opts.session,
    context: { container: opts.container },
  }
}
