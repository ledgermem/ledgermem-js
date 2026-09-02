import { describe, expect, it } from 'vitest'

import { Mnemo } from './index.js'
import type { Memory } from './index.js'
import { capture } from './test-helpers.js'

const MEMORY: Memory = {
  id: 'mem_1',
  scope: { type: 'user', id: 'jane' },
  scopeKey: 'user:jane',
  container: { id: 'c1', tag: 'user:jane', containerType: 'user', displayName: null },
  content: 'Call the dentist',
  contentHash: null,
  idempotencyKey: null,
  memoryType: 'reminder',
  mutationPolicy: 'standard',
  protectedAt: null,
  metadata: null,
  source: null,
  sourceDocumentId: null,
  eventId: null,
  deletedAt: null,
  dueAt: '2026-09-10T09:00:00.000Z',
  createdBy: { kind: 'api_key', id: 'key_1', label: 'Chrome extension' },
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
}

describe('memory provenance and reminders (0.6.0)', () => {
  describe('list', () => {
    it('sends since, until, createdByKind and memoryType as query params', async () => {
      const wire = capture({ items: [MEMORY], nextCursor: null })
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      const page = await client.list({
        containerTag: 'user:jane',
        since: '2026-09-01T00:00:00.000Z',
        until: '2026-09-02T00:00:00.000Z',
        createdByKind: 'api_key',
        memoryType: 'reminder',
        limit: 5,
      })
      expect(wire.last().method).toBe('GET')
      expect(wire.last().path).toBe('/v1/memories')
      expect(wire.last().query).toEqual({
        limit: '5',
        containerTag: 'user:jane',
        since: '2026-09-01T00:00:00.000Z',
        until: '2026-09-02T00:00:00.000Z',
        createdByKind: 'api_key',
        memoryType: 'reminder',
      })
      expect(page.items[0]?.createdBy?.label).toBe('Chrome extension')
      expect(page.items[0]?.dueAt).toBe('2026-09-10T09:00:00.000Z')
    })

    it('omits the new filters when they are not given', async () => {
      const wire = capture({ items: [], nextCursor: null })
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await client.list({ containerTag: 'user:jane' })
      expect(wire.last().query).toEqual({ containerTag: 'user:jane' })
    })
  })

  describe('add', () => {
    it('passes dueAt through on a single memory item', async () => {
      const wire = capture({
        scopeKey: 'user:jane',
        scope: { type: 'user', id: 'jane' },
        items: [MEMORY],
        receipt: {
          writeId: '22222222-2222-4222-8222-222222222222',
          status: 'searchable',
          searchableAt: '2026-09-02T00:00:00.000Z',
          items: [{ inputIndex: 0, memoryId: 'mem_1', status: 'created' }],
        },
      })
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await client.add({
        containerTag: 'user:jane',
        content: 'Call the dentist',
        dueAt: '2026-09-10T09:00:00.000Z',
      })
      expect(wire.last().body).toEqual({
        items: [{ content: 'Call the dentist', dueAt: '2026-09-10T09:00:00.000Z' }],
        containerTag: 'user:jane',
      })
    })
  })

  describe('update', () => {
    it('accepts dueAt alone and sends null to clear it', async () => {
      const wire = capture(MEMORY)
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await client.update('mem_1', { dueAt: null }, { containerTag: 'user:jane' })
      expect(wire.last().method).toBe('PATCH')
      expect(wire.last().path).toBe('/v1/memories/mem_1')
      expect(wire.last().body).toEqual({ dueAt: null })
    })
  })
})
