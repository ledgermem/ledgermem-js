import { describe, expect, it } from 'vitest'

import { Mnemo } from '../index.js'
import type { Reminder } from '../index.js'
import { capture, fakeFetch, json } from '../test-helpers.js'

const REMINDER: Reminder = {
  id: 'mem_1',
  scope: { type: 'person', id: 'jane-doe' },
  scopeKey: 'person:jane-doe',
  container: { id: 'c1', tag: 'person:jane-doe', containerType: 'person', displayName: 'Jane Doe' },
  content: 'Send Jane the deck',
  contentHash: null,
  idempotencyKey: 'deck-1',
  memoryType: 'reminder',
  mutationPolicy: 'standard',
  protectedAt: null,
  metadata: null,
  source: null,
  sourceDocumentId: null,
  eventId: null,
  deletedAt: null,
  dueAt: '2026-09-10T09:00:00.000Z',
  createdBy: { kind: 'api_key', id: 'key_1', label: 'server' },
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  completedAt: null,
  person: { slug: 'jane-doe', displayName: 'Jane Doe' },
}

describe('Mnemo.reminders', () => {
  describe('create', () => {
    it('sends personSlug alone and never the default container beside it', async () => {
      const wire = capture(REMINDER, 201)
      const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
      const reminder = await client.reminders.create({
        content: 'Send Jane the deck',
        dueAt: '2026-09-10T09:00:00.000Z',
        personSlug: 'jane-doe',
        idempotencyKey: 'deck-1',
      })
      expect(wire.last().method).toBe('POST')
      expect(wire.last().path).toBe('/v1/reminders')
      expect(wire.last().body).toEqual({
        content: 'Send Jane the deck',
        dueAt: '2026-09-10T09:00:00.000Z',
        personSlug: 'jane-doe',
        idempotencyKey: 'deck-1',
      })
      expect(reminder.person?.slug).toBe('jane-doe')
    })

    it('sends a structured scope when given', async () => {
      const wire = capture(REMINDER, 201)
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await client.reminders.create({
        content: 'x',
        dueAt: '2026-09-10T09:00:00.000Z',
        scope: { type: 'customer', id: 'acme' },
      })
      expect(wire.last().body).toEqual({
        content: 'x',
        dueAt: '2026-09-10T09:00:00.000Z',
        scope: { type: 'customer', id: 'acme' },
      })
    })

    it('falls back to defaultContainerTag and rejects an unscoped call', async () => {
      const wire = capture(REMINDER, 201)
      const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
      await client.reminders.create({ content: 'x', dueAt: '2026-09-10T09:00:00.000Z', metadata: { a: 1 } })
      expect(wire.last().body).toEqual({
        content: 'x',
        dueAt: '2026-09-10T09:00:00.000Z',
        metadata: { a: 1 },
        containerTag: 'user:me',
      })

      const bare = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await expect(
        bare.reminders.create({ content: 'x', dueAt: '2026-09-10T09:00:00.000Z' }),
      ).rejects.toThrow(/container is required/)
    })

    it('does not retry an ambiguous transport failure without an idempotency key', async () => {
      let calls = 0
      const client = new Mnemo({
        apiKey: 'k',
        defaultContainerTag: 'user:me',
        maxRetries: 2,
        fetch: fakeFetch(() => {
          calls += 1
          throw new TypeError('connection reset after write')
        }),
      })
      await expect(
        client.reminders.create({ content: 'x', dueAt: '2026-09-10T09:00:00.000Z' }),
      ).rejects.toThrow(/connection reset/i)
      expect(calls).toBe(1)
    })

    it('retries an ambiguous transport failure when an idempotency key is set', async () => {
      let calls = 0
      const client = new Mnemo({
        apiKey: 'k',
        defaultContainerTag: 'user:me',
        maxRetries: 1,
        fetch: fakeFetch(() => {
          calls += 1
          if (calls === 1) throw new TypeError('connection reset after write')
          return json(REMINDER, 201)
        }),
      })
      await expect(
        client.reminders.create({
          content: 'x',
          dueAt: '2026-09-10T09:00:00.000Z',
          idempotencyKey: 'deck-1',
        }),
      ).resolves.toMatchObject({ id: 'mem_1' })
      expect(calls).toBe(2)
    })
  })

  describe('list', () => {
    it('sends GET /v1/reminders with every filter as a query param', async () => {
      const wire = capture({ items: [REMINDER], nextCursor: null, total: 1 })
      const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
      const page = await client.reminders.list({
        status: 'all',
        dueAfter: '2026-09-01T00:00:00.000Z',
        dueBefore: '2026-09-30T00:00:00.000Z',
        days: 30,
        containerType: 'person',
        containerTag: 'person:jane-doe',
        limit: 50,
        cursor: 'c1',
      })
      expect(wire.last().method).toBe('GET')
      expect(wire.last().path).toBe('/v1/reminders')
      expect(wire.last().query).toEqual({
        status: 'all',
        dueAfter: '2026-09-01T00:00:00.000Z',
        dueBefore: '2026-09-30T00:00:00.000Z',
        days: '30',
        containerType: 'person',
        containerTag: 'person:jane-doe',
        limit: '50',
        cursor: 'c1',
      })
      expect(page.items[0]?.completedAt).toBeNull()
    })

    it('is workspace-wide by default: no defaultContainerTag is injected', async () => {
      const wire = capture({ items: [], nextCursor: null, total: 0 })
      const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
      await client.reminders.list()
      expect(wire.last().query).toEqual({})
    })
  })

  describe('upcoming', () => {
    it('sends GET /v1/reminders/upcoming with days, timezone and filters', async () => {
      const wire = capture({
        overdue: [],
        dueToday: [REMINDER],
        upcoming: [],
        importantDates: [
          { personSlug: 'jane-doe', displayName: 'Jane Doe', label: 'Birthday', date: '2026-09-12', daysUntil: 10, recurring: true },
        ],
        generatedAt: '2026-09-02T00:00:00.000Z',
        timezone: 'Asia/Karachi',
      })
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      const buckets = await client.reminders.upcoming({ days: 14, timezone: 'Asia/Karachi', containerType: 'person', limit: 20 })
      expect(wire.last().path).toBe('/v1/reminders/upcoming')
      expect(wire.last().query).toEqual({ days: '14', timezone: 'Asia/Karachi', containerType: 'person', limit: '20' })
      expect(buckets.dueToday).toHaveLength(1)
      expect(buckets.importantDates[0]?.daysUntil).toBe(10)
    })

    it('sends no query when called without input', async () => {
      const wire = capture({ overdue: [], dueToday: [], upcoming: [], importantDates: [], generatedAt: 'x', timezone: 'UTC' })
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await client.reminders.upcoming()
      expect(wire.last().query).toEqual({})
    })
  })

  describe('by id', () => {
    it('update sends PATCH /v1/reminders/{memoryId} with the patch body and no container', async () => {
      const wire = capture(REMINDER)
      const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
      await client.reminders.update('mem_1', { dueAt: '2026-09-11T09:00:00.000Z', metadata: { priority: 'high' } })
      expect(wire.last().method).toBe('PATCH')
      expect(wire.last().path).toBe('/v1/reminders/mem_1')
      expect(wire.last().query).toEqual({})
      expect(wire.last().body).toEqual({ dueAt: '2026-09-11T09:00:00.000Z', metadata: { priority: 'high' } })
    })

    it('update requires at least one field', async () => {
      const wire = capture(REMINDER)
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await expect(client.reminders.update('mem_1', {})).rejects.toThrow(/at least one field/)
    })

    it('complete sends POST /v1/reminders/{memoryId}/complete without a body', async () => {
      const wire = capture({ ...REMINDER, dueAt: null, completedAt: '2026-09-02T01:00:00.000Z' })
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      const done = await client.reminders.complete('mem_1')
      expect(wire.last().method).toBe('POST')
      expect(wire.last().path).toBe('/v1/reminders/mem_1/complete')
      expect(wire.last().body).toBeUndefined()
      expect(done.completedAt).toBe('2026-09-02T01:00:00.000Z')
      expect(done.dueAt).toBeNull()
    })

    it('reopen sends POST /v1/reminders/{memoryId}/reopen with the new dueAt', async () => {
      const wire = capture(REMINDER)
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await client.reminders.reopen('mem_1', { dueAt: '2026-09-12T09:00:00.000Z' })
      expect(wire.last().method).toBe('POST')
      expect(wire.last().path).toBe('/v1/reminders/mem_1/reopen')
      expect(wire.last().body).toEqual({ dueAt: '2026-09-12T09:00:00.000Z' })
    })

    it('encodes the memory id in the path', async () => {
      const wire = capture(REMINDER)
      const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
      await client.reminders.complete('a/b')
      expect(wire.last().path).toBe('/v1/reminders/a%2Fb/complete')
    })
  })
})
