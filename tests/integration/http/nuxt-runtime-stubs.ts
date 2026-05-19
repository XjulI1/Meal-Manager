/**
 * Stubs Nuxt/Nitro auto-imports for handler tests that exercise routes
 * outside the Nuxt runtime. Imported by `vitest.config.ts` as a setup file.
 */
import { vi } from 'vitest'

interface MockH3Error extends Error {
  statusCode: number
  statusMessage?: string
  data?: unknown
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

;(globalThis as any).getHeader = (event: { _headers?: Record<string, string> }, name: string) => {
  if (!event._headers) return undefined
  const lower = name.toLowerCase()
  for (const k of Object.keys(event._headers)) {
    if (k.toLowerCase() === lower) return event._headers[k]
  }
  return undefined
}

;(globalThis as any).setResponseStatus = (event: { _status?: number }, status: number) => {
  event._status = status
}

;(globalThis as any).setResponseHeader = (
  event: { _responseHeaders?: Record<string, string> },
  name: string,
  value: string,
) => {
  if (!event._responseHeaders) event._responseHeaders = {}
  event._responseHeaders[name] = value
}

;(globalThis as any).createError = (opts: {
  statusCode: number
  statusMessage?: string
  data?: unknown
}): MockH3Error => {
  const err = new Error(opts.statusMessage ?? 'Error') as MockH3Error
  err.statusCode = opts.statusCode
  err.statusMessage = opts.statusMessage
  if (opts.data !== undefined) err.data = opts.data
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
  _headers?: Record<string, string>
  _responseHeaders?: Record<string, string>
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
  headers?: Record<string, string>
  session?: { user?: { id: string, email: string } }
  container: any
}): MockEvent<TBody> {
  return {
    _body: opts.body,
    _query: opts.query,
    _params: opts.params,
    _headers: opts.headers,
    _session: opts.session,
    context: { container: opts.container },
  }
}
