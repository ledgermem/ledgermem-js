import { describe, expect, it } from 'vitest'

import { Mnemo } from '../index.js'
import type { Person } from '../index.js'
import { capture } from '../test-helpers.js'

const PERSON: Person = {
  slug: 'jane-doe',
  tag: 'person:jane-doe',
  containerId: '11111111-1111-4111-8111-111111111111',
  displayName: 'Jane Doe',
  relationship: 'friend',
  email: 'jane@example.com',
  phone: '+14155550100',
  company: null,
  notes: null,
  importantDates: [{ label: 'Birthday', date: '1990-04-12', recurring: true }],
  aliases: ['JD'],
  archivedAt: null,
  memoryCount: 3,
  openReminderCount: 1,
  nextReminderAt: '2026-09-10T09:00:00.000Z',
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
}

describe('Mnemo.people', () => {
  it('create sends POST /v1/people with the person body', async () => {
    const wire = capture(PERSON, 201)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const person = await client.people.create({
      displayName: 'Jane Doe',
      relationship: 'friend',
      email: 'jane@example.com',
      importantDates: [{ label: 'Birthday', date: '1990-04-12', recurring: true }],
    })
    expect(wire.last().method).toBe('POST')
    expect(wire.last().path).toBe('/v1/people')
    expect(wire.last().body).toEqual({
      displayName: 'Jane Doe',
      relationship: 'friend',
      email: 'jane@example.com',
      importantDates: [{ label: 'Birthday', date: '1990-04-12', recurring: true }],
    })
    expect(person.tag).toBe('person:jane-doe')
    expect(person.importantDates[0]?.recurring).toBe(true)
  })

  it('list sends GET /v1/people with q, includeArchived and paging', async () => {
    const wire = capture({ items: [PERSON], nextCursor: 'c2', total: 1 })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const page = await client.people.list({ q: 'jane', includeArchived: true, limit: 10, cursor: 'c1' })
    expect(wire.last().method).toBe('GET')
    expect(wire.last().path).toBe('/v1/people')
    expect(wire.last().query).toEqual({ q: 'jane', includeArchived: 'true', limit: '10', cursor: 'c1' })
    expect(page.total).toBe(1)
    expect(page.nextCursor).toBe('c2')
  })

  it('list sends no query when called without input', async () => {
    const wire = capture({ items: [], nextCursor: null, total: 0 })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await client.people.list()
    expect(wire.last().query).toEqual({})
  })

  it('get sends GET /v1/people/{slug} with the slug encoded', async () => {
    const wire = capture(PERSON)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const person = await client.people.get('jane-doe')
    expect(wire.last().method).toBe('GET')
    expect(wire.last().path).toBe('/v1/people/jane-doe')
    expect(person.slug).toBe('jane-doe')
  })

  it('update sends PATCH /v1/people/{slug} and forwards explicit nulls', async () => {
    const wire = capture({ ...PERSON, company: null, archivedAt: '2026-09-02T00:00:00.000Z' })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await client.people.update('jane-doe', { company: null, archived: true })
    expect(wire.last().method).toBe('PATCH')
    expect(wire.last().path).toBe('/v1/people/jane-doe')
    expect(wire.last().body).toEqual({ company: null, archived: true })
  })

  it('update requires at least one field', async () => {
    const wire = capture(PERSON)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await expect(client.people.update('jane-doe', {})).rejects.toThrow(/at least one field/)
  })

  it('archive sends DELETE /v1/people/{slug} and only adds deleteMemories when true', async () => {
    const wire = capture({ slug: 'jane-doe', archived: true, memoriesDeleted: 3 })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const plain = await client.people.archive('jane-doe')
    expect(wire.last().method).toBe('DELETE')
    expect(wire.last().path).toBe('/v1/people/jane-doe')
    expect(wire.last().query).toEqual({})
    expect(plain.archived).toBe(true)

    await client.people.archive('jane-doe', { deleteMemories: true })
    expect(wire.last().query).toEqual({ deleteMemories: 'true' })
  })

  it('summary sends GET /v1/people/{slug}/summary with an optional q', async () => {
    const wire = capture({
      slug: 'jane-doe',
      answer: 'Jane is a friend.',
      citations: [{ type: 'memory', score: 0.9, content: 'Jane is a friend.', sourceId: 'mem_1' }],
      abstained: false,
      openReminders: [],
      recentMemories: [],
    })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const summary = await client.people.summary('jane-doe')
    expect(wire.last().path).toBe('/v1/people/jane-doe/summary')
    expect(wire.last().query).toEqual({})
    expect(summary.citations[0]?.sourceId).toBe('mem_1')

    await client.people.summary('jane-doe', { q: 'What does she like?' })
    expect(wire.last().query).toEqual({ q: 'What does she like?' })
  })
})
