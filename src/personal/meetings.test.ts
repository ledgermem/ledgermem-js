import { describe, expect, it } from 'vitest'

import { Mnemo } from '../index.js'
import type { Meeting } from '../index.js'
import { capture } from '../test-helpers.js'

const MEETING: Meeting = {
  documentId: '33333333-3333-4333-8333-333333333333',
  eventId: 'evt_1',
  title: 'Roadmap sync',
  start: '2026-09-03T09:00:00Z',
  end: '2026-09-03T09:30:00Z',
  isAllDay: false,
  status: 'confirmed',
  htmlLink: 'https://calendar.google.com/event?eid=1',
  location: null,
  organizer: { email: 'me@example.com', name: 'Me' },
  attendees: [
    { email: 'jane@example.com', name: 'Jane Doe', responseStatus: 'accepted', self: false, person: { slug: 'jane-doe', displayName: 'Jane Doe' } },
  ],
  containerTag: 'connector:google-calendar:abc',
  connectionId: '44444444-4444-4444-8444-444444444444',
  attendeeSource: 'metadata',
}

describe('Mnemo.meetings', () => {
  it('upcoming sends GET /v1/meetings/upcoming with days, limit, cursor and containerTag', async () => {
    const wire = capture({
      items: [MEETING],
      nextCursor: null,
      connections: [{ id: 'conn_1', containerTag: 'connector:google-calendar:abc', status: 'active', lastSyncAt: null }],
    })
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
    const page = await client.meetings.upcoming({ days: 3, limit: 10, cursor: 'c1', containerTag: 'connector:google-calendar:abc' })
    expect(wire.last().method).toBe('GET')
    expect(wire.last().path).toBe('/v1/meetings/upcoming')
    expect(wire.last().query).toEqual({ days: '3', limit: '10', cursor: 'c1', containerTag: 'connector:google-calendar:abc' })
    expect(page.items[0]?.attendees[0]?.person?.slug).toBe('jane-doe')
    expect(page.connections[0]?.status).toBe('active')
  })

  it('upcoming is workspace-wide by default: no defaultContainerTag is injected', async () => {
    const wire = capture({ items: [], nextCursor: null, connections: [] })
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
    await client.meetings.upcoming()
    expect(wire.last().query).toEqual({})
  })

  it('get sends GET /v1/meetings/{documentId}', async () => {
    const wire = capture(MEETING)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const meeting = await client.meetings.get(MEETING.documentId)
    expect(wire.last().path).toBe(`/v1/meetings/${MEETING.documentId}`)
    expect(meeting.title).toBe('Roadmap sync')
  })

  it('brief sends GET /v1/meetings/{documentId}/brief with an optional q', async () => {
    const wire = capture({
      ...MEETING,
      brief: { answer: 'Jane wants the deck first.', citations: [], abstained: false, cached: true },
      people: [{ slug: 'jane-doe', displayName: 'Jane Doe', relationship: 'client', openReminders: [], recentMemories: [] }],
      previousMeetings: [{ documentId: 'doc_0', title: 'Kickoff', start: '2026-08-01T09:00:00Z' }],
      generatedAt: '2026-09-02T03:00:00.000Z',
    })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const brief = await client.meetings.brief(MEETING.documentId)
    expect(wire.last().path).toBe(`/v1/meetings/${MEETING.documentId}/brief`)
    expect(wire.last().query).toEqual({})
    expect(brief.brief?.cached).toBe(true)
    expect(brief.people[0]?.relationship).toBe('client')

    await client.meetings.brief(MEETING.documentId, { q: 'Any open loops?' })
    expect(wire.last().query).toEqual({ q: 'Any open loops?' })
  })
})
