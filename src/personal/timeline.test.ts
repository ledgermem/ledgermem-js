import { describe, expect, it } from 'vitest'

import { Mnemo } from '../index.js'
import type { Timeline } from '../index.js'
import { capture } from '../test-helpers.js'

const TIMELINE: Timeline = {
  items: [
    {
      id: 'memory:mem_1',
      type: 'memory',
      refId: 'mem_1',
      occurredAt: '2026-09-02T10:00:00.000Z',
      title: 'Jane prefers rice',
      snippet: 'Jane prefers Japanese short-grain rice.',
      containerTag: 'person:jane-doe',
      createdBy: { kind: 'user', id: 'u1', label: null },
      meta: { memoryType: 'preference', memoryId: 'mem_1' },
    },
  ],
  nextCursor: 'c2',
  container: { tag: 'person:jane-doe', containerType: 'person', displayName: 'Jane Doe' },
  range: { from: null, to: null },
}

describe('Mnemo.timeline', () => {
  it('get sends GET /v1/timeline with containerTag and every filter', async () => {
    const wire = capture(TIMELINE)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const page = await client.timeline.get({
      containerTag: 'person:jane-doe',
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-03T00:00:00.000Z',
      types: ['memory', 'document', 'event'],
      direction: 'asc',
      limit: 25,
      cursor: 'c1',
    })
    expect(wire.last().method).toBe('GET')
    expect(wire.last().path).toBe('/v1/timeline')
    expect(wire.last().query).toEqual({
      containerTag: 'person:jane-doe',
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-03T00:00:00.000Z',
      types: 'memory,document,event',
      direction: 'asc',
      limit: '25',
      cursor: 'c1',
    })
    expect(page.items[0]?.type).toBe('memory')
    expect(page.container?.displayName).toBe('Jane Doe')
  })

  it('sends a structured scope as scopeType and scopeId', async () => {
    const wire = capture(TIMELINE)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await client.timeline.get({ scope: { type: 'customer', id: 'acme' } })
    expect(wire.last().query).toEqual({ scopeType: 'customer', scopeId: 'acme' })
  })

  it('falls back to defaultContainerTag and rejects an unscoped call', async () => {
    const wire = capture(TIMELINE)
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
    await client.timeline.get()
    expect(wire.last().query).toEqual({ containerTag: 'user:me' })

    const bare = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await expect(bare.timeline.get()).rejects.toThrow(/container is required/)
  })

  it('omits types when the array is empty', async () => {
    const wire = capture(TIMELINE)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await client.timeline.get({ containerTag: 'user:me', types: [] })
    expect(wire.last().query).toEqual({ containerTag: 'user:me' })
  })
})
