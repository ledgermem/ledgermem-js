import { describe, expect, it } from 'vitest'

import { Mnemo } from '../index.js'
import type { DailyBrief } from '../index.js'
import { capture } from '../test-helpers.js'

const BRIEF: DailyBrief = {
  date: '2026-09-02',
  timezone: 'Asia/Karachi',
  generatedAt: '2026-09-02T03:00:00.000Z',
  scope: { kind: 'container', containerTag: 'user:me' },
  reminders: { overdue: [], dueToday: [], upcoming: [] },
  importantDates: [],
  recentMemories: [],
  counts: { memoriesLast24h: 4, documentsLast24h: 1 },
  followUps: { answer: 'Reply to Jane about the deck.', citations: [], abstained: false, cached: false },
  meetings: null,
}

describe('Mnemo.brief', () => {
  it('today sends GET /v1/brief with containerTag, timezone, days and sections', async () => {
    const wire = capture(BRIEF)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const brief = await client.brief.today({
      containerTag: 'user:me',
      timezone: 'Asia/Karachi',
      days: 3,
      sections: ['core', 'followUps'],
    })
    expect(wire.last().method).toBe('GET')
    expect(wire.last().path).toBe('/v1/brief')
    expect(wire.last().query).toEqual({
      containerTag: 'user:me',
      timezone: 'Asia/Karachi',
      days: '3',
      sections: 'core,followUps',
    })
    expect(brief.counts?.memoriesLast24h).toBe(4)
    expect(brief.followUps?.abstained).toBe(false)
  })

  it('get adds the date and accepts a structured scope', async () => {
    const wire = capture(BRIEF)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await client.brief.get({ scope: { type: 'user', id: 'me' }, date: '2026-09-01' })
    expect(wire.last().query).toEqual({ scopeType: 'user', scopeId: 'me', date: '2026-09-01' })
  })

  it('falls back to defaultContainerTag and rejects an unscoped call', async () => {
    const wire = capture(BRIEF)
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
    await client.brief.today()
    expect(wire.last().query).toEqual({ containerTag: 'user:me' })

    const bare = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await expect(bare.brief.today()).rejects.toThrow(/container is required/)
  })
})
