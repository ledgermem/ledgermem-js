import { describe, expect, it } from 'vitest'

import { Mnemo } from '../index.js'
import type { MergeMemoriesResponse } from '../index.js'
import { capture } from '../test-helpers.js'

const ID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ID_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const MERGED: MergeMemoriesResponse = {
  memory: {
    id: ID_A,
    scope: { type: 'user', id: 'jane' },
    scopeKey: 'user:jane',
    container: { id: 'c1', tag: 'user:jane', containerType: 'user', displayName: null },
    content: 'Jane prefers short-grain rice and avoids shellfish.',
    contentHash: null,
    idempotencyKey: 'merge:abc',
    memoryType: 'preference',
    mutationPolicy: 'standard',
    protectedAt: null,
    metadata: { mergedFromIds: [ID_B] },
    source: null,
    sourceDocumentId: null,
    eventId: null,
    deletedAt: null,
    dueAt: null,
    createdBy: { kind: 'api_key', id: 'key_1', label: null },
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  },
  mergedFromIds: [ID_B],
  deletedIds: [ID_B],
  replayed: false,
}

describe('Mnemo.memories.merge', () => {
  it('sends POST /v1/memories/merge with ids, into and the container', async () => {
    const wire = capture(MERGED)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const result = await client.memories.merge({
      containerTag: 'user:jane',
      ids: [ID_A, ID_B],
      into: ID_A,
      metadata: { reviewed: true },
      mergeKey: 'abc',
    })
    expect(wire.last().method).toBe('POST')
    expect(wire.last().path).toBe('/v1/memories/merge')
    expect(wire.last().body).toEqual({
      ids: [ID_A, ID_B],
      into: ID_A,
      metadata: { reviewed: true },
      mergeKey: 'abc',
      containerTag: 'user:jane',
    })
    expect(result.deletedIds).toEqual([ID_B])
    expect(result.replayed).toBe(false)
  })

  it('creates a new survivor from content when into is omitted, using a scope', async () => {
    const wire = capture(MERGED)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await client.memories.merge({
      scope: { type: 'user', id: 'jane' },
      ids: [ID_A, ID_B, ID_C],
      content: 'Combined',
      memoryType: 'note',
    })
    expect(wire.last().body).toEqual({
      ids: [ID_A, ID_B, ID_C],
      content: 'Combined',
      memoryType: 'note',
      scope: { type: 'user', id: 'jane' },
    })
  })

  it('falls back to defaultContainerTag and rejects an unscoped call', async () => {
    const wire = capture(MERGED)
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:jane', fetch: wire.fetch })
    await client.memories.merge({ ids: [ID_A, ID_B], into: ID_A })
    expect(wire.last().body).toEqual({ ids: [ID_A, ID_B], into: ID_A, containerTag: 'user:jane' })

    const bare = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await expect(bare.memories.merge({ ids: [ID_A, ID_B], into: ID_A })).rejects.toThrow(/container is required/)
  })

  it('rejects fewer than 2 or more than 20 ids before sending', async () => {
    const wire = capture(MERGED)
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:jane', fetch: wire.fetch })
    await expect(client.memories.merge({ ids: [ID_A], into: ID_A })).rejects.toThrow(/between 2 and 20/)
    const many = Array.from({ length: 21 }, (_, i) => `${i}`)
    await expect(client.memories.merge({ ids: many, content: 'x' })).rejects.toThrow(/between 2 and 20/)
  })

  it('rejects an into that is not one of ids, and a new survivor without content', async () => {
    const wire = capture(MERGED)
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:jane', fetch: wire.fetch })
    await expect(client.memories.merge({ ids: [ID_A, ID_B], into: ID_C })).rejects.toThrow(/into must be one of ids/)
    await expect(client.memories.merge({ ids: [ID_A, ID_B] })).rejects.toThrow(/content is required/)
  })
})
