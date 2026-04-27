import { describe, expect, it } from 'vitest'

import { LedgerMem, LedgerMemHTTPError } from './index.js'

const ISO = '2026-04-27T12:00:00.000Z'

function memoryResponse(id = 'mem_123') {
  return {
    id,
    content: 'User prefers Japanese rice.',
    metadata: { source: 'test' },
    workspaceId: 'ws_test',
    actorId: null,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function fakeFetch(handler: (req: Request) => Response | Promise<Response>): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    return Promise.resolve(handler(req))
  }) as typeof fetch
}

describe('LedgerMem', () => {
  it('search() round-trips and parses hits', async () => {
    const client = new LedgerMem({
      apiKey: 'test',
      workspaceId: 'ws_test',
      fetch: fakeFetch(async (req) => {
        expect(new URL(req.url).pathname).toBe('/v1/search')
        const body = (await req.json()) as { query: string; limit: number }
        expect(body.query).toBe('rice')
        expect(body.limit).toBe(5)
        return new Response(
          JSON.stringify({
            hits: [
              {
                memoryId: 'mem_1',
                content: 'User prefers Japanese rice.',
                score: 0.91,
                source: { documentId: 'doc_1' },
              },
            ],
            query: 'rice',
            latencyMs: 42,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }),
    })
    const res = await client.search({ query: 'rice', limit: 5 })
    expect(res.latencyMs).toBe(42)
    expect(res.hits).toHaveLength(1)
    expect(res.hits[0]?.score).toBe(0.91)
  })

  it('add() returns a typed memory', async () => {
    const client = new LedgerMem({
      apiKey: 'test',
      workspaceId: 'ws_test',
      fetch: fakeFetch(
        () =>
          new Response(JSON.stringify(memoryResponse()), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    })
    const mem = await client.add({ content: 'User prefers Japanese rice.' })
    expect(mem.id).toBe('mem_123')
  })

  it('throws LedgerMemHTTPError with status + body on non-2xx', async () => {
    const client = new LedgerMem({
      apiKey: 'test',
      workspaceId: 'ws_test',
      fetch: fakeFetch(
        () =>
          new Response(JSON.stringify({ message: 'invalid api key' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    })
    await expect(client.search({ query: 'x' })).rejects.toMatchObject({
      name: 'LedgerMemHTTPError',
      status: 401,
    })
    try {
      await client.search({ query: 'x' })
    } catch (err) {
      expect(err).toBeInstanceOf(LedgerMemHTTPError)
      expect((err as LedgerMemHTTPError).status).toBe(401)
    }
  })

  it('update() requires content or metadata', async () => {
    const client = new LedgerMem({
      apiKey: 'test',
      workspaceId: 'ws_test',
      fetch: fakeFetch(() => new Response('{}', { status: 200 })),
    })
    await expect(client.update('mem_1', {})).rejects.toThrow(/at least one of/)
  })
})
