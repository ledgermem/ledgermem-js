/**
 * Shared vitest helpers. Not part of the published bundle (nothing under
 * `src/index.ts` imports this file).
 */

export function fakeFetch(
  handler: (req: Request) => Response | Promise<Response>,
): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    return Promise.resolve(handler(req))
  }) as typeof fetch
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export type CapturedRequest = {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
}

/**
 * Capture one request's method, path, query and JSON body while answering it
 * with `response`. Returns the capture slot; read it after the call resolves.
 */
export function capture(
  response: unknown,
  status = 200,
): { fetch: typeof fetch; last: () => CapturedRequest } {
  let last: CapturedRequest | undefined
  const fetchImpl = fakeFetch(async (req) => {
    const url = new URL(req.url)
    const text = await req.text()
    last = {
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body: text ? (JSON.parse(text) as unknown) : undefined,
    }
    return json(response, status)
  })
  return {
    fetch: fetchImpl,
    last: () => {
      if (!last) throw new Error('no request was captured')
      return last
    },
  }
}
