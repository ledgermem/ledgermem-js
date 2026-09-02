import type { Scope } from './types.js'

/**
 * Per-request transport options. `retryAmbiguousFailure` controls whether a
 * timeout or dropped connection (the server may already have applied the
 * write) is retried: `true` retries, `false` never retries, `undefined`
 * keeps the transport default (retry transport errors, not timeouts).
 */
export type RequestOptions = { retryAmbiguousFailure?: boolean }

/** Sends one JSON request against the API. Bound to the client's transport. */
export type Requester = <T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
) => Promise<T>

export type ContainerInput = { containerTag?: string; scope?: Scope }

export type ResolvedContainer = { containerTag: string } | { scope: Scope }

/**
 * Resolves the container for a call (explicit `scope`, explicit `containerTag`,
 * or the client's `defaultContainerTag`) and throws when none is available.
 */
export type ContainerResolver = (
  method: string,
  input: ContainerInput,
) => ResolvedContainer

export type QueryValue = string | number | boolean | undefined

/**
 * Build a query string from a plain record. `undefined` values are skipped;
 * booleans serialise as `"true"` / `"false"` (the API's query-boolean form).
 * Returns `""` when nothing was set, otherwise a string starting with `?`.
 */
export function toQueryString(values: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue
    params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** Query-string form of a resolved container (`GET` routes). */
export function containerQuery(
  container: ResolvedContainer,
): Record<string, QueryValue> {
  if ('scope' in container) {
    return { scopeType: container.scope.type, scopeId: container.scope.id }
  }
  return { containerTag: container.containerTag }
}

export function assertBatchSize(label: string, size: number, max: number): void {
  if (size < 1 || size > max) {
    throw new Error(`${label}: batch size must be between 1 and ${max}`)
  }
}

export function assertSomeField(label: string, input: object): void {
  if (Object.values(input).every((value) => value === undefined)) {
    throw new Error(`${label}: at least one field must be provided`)
  }
}

export function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}
