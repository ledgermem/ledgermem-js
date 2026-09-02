import { describe, expect, it } from 'vitest'

import { Mnemo } from '../index.js'
import type { InboundChannel } from '../index.js'
import { capture } from '../test-helpers.js'

const CHANNEL: InboundChannel = {
  id: '55555555-5555-4555-8555-555555555555',
  provider: 'twilio',
  phoneMasked: '+1•••••0100',
  containerTag: 'phone:+14155550100',
  userId: null,
  status: 'pending',
  verificationCode: '123456',
  verifiedAt: null,
  lastMessageAt: null,
  webhookUrl: 'https://api.mnemohq.com/v1/inbound/twilio',
  inboundNumber: '+15550001111',
  whatsappSender: null,
  sandboxJoinWord: null,
  createdAt: '2026-09-02T00:00:00.000Z',
}

describe('Mnemo.inbound.channels', () => {
  it('create sends POST /v1/inbound/channels with the phone and no implicit container', async () => {
    const wire = capture(CHANNEL, 201)
    const client = new Mnemo({ apiKey: 'k', defaultContainerTag: 'user:me', fetch: wire.fetch })
    const channel = await client.inbound.channels.create({ phone: '+1 (415) 555-0100' })
    expect(wire.last().method).toBe('POST')
    expect(wire.last().path).toBe('/v1/inbound/channels')
    expect(wire.last().body).toEqual({ phone: '+1 (415) 555-0100' })
    expect(channel.verificationCode).toBe('123456')
    expect(channel.status).toBe('pending')
  })

  it('create forwards an explicit containerTag or scope', async () => {
    const wire = capture(CHANNEL, 201)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await client.inbound.channels.create({ phone: '+14155550100', containerTag: 'user:me' })
    expect(wire.last().body).toEqual({ phone: '+14155550100', containerTag: 'user:me' })

    await client.inbound.channels.create({ phone: '+14155550100', scope: { type: 'user', id: 'me' } })
    expect(wire.last().body).toEqual({ phone: '+14155550100', scope: { type: 'user', id: 'me' } })
  })

  it('list sends GET /v1/inbound/channels with paging', async () => {
    const wire = capture({ items: [CHANNEL], nextCursor: null, total: 1 })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const page = await client.inbound.channels.list({ limit: 5, cursor: 'c1' })
    expect(wire.last().method).toBe('GET')
    expect(wire.last().path).toBe('/v1/inbound/channels')
    expect(wire.last().query).toEqual({ limit: '5', cursor: 'c1' })
    expect(page.total).toBe(1)

    await client.inbound.channels.list()
    expect(wire.last().query).toEqual({})
  })

  it('get, update, delete and regenerateCode address /v1/inbound/channels/{id}', async () => {
    const wire = capture(CHANNEL)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })

    await client.inbound.channels.get(CHANNEL.id)
    expect(wire.last().method).toBe('GET')
    expect(wire.last().path).toBe(`/v1/inbound/channels/${CHANNEL.id}`)

    await client.inbound.channels.update(CHANNEL.id, { status: 'disabled' })
    expect(wire.last().method).toBe('PATCH')
    expect(wire.last().path).toBe(`/v1/inbound/channels/${CHANNEL.id}`)
    expect(wire.last().body).toEqual({ status: 'disabled' })

    await client.inbound.channels.regenerateCode(CHANNEL.id)
    expect(wire.last().method).toBe('POST')
    expect(wire.last().path).toBe(`/v1/inbound/channels/${CHANNEL.id}/regenerate-code`)
    expect(wire.last().body).toBeUndefined()
  })

  it('delete returns the deletion receipt', async () => {
    const wire = capture({ id: CHANNEL.id, deleted: true })
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    const receipt = await client.inbound.channels.delete(CHANNEL.id)
    expect(wire.last().method).toBe('DELETE')
    expect(wire.last().path).toBe(`/v1/inbound/channels/${CHANNEL.id}`)
    expect(receipt).toEqual({ id: CHANNEL.id, deleted: true })
  })

  it('update requires at least one field', async () => {
    const wire = capture(CHANNEL)
    const client = new Mnemo({ apiKey: 'k', fetch: wire.fetch })
    await expect(client.inbound.channels.update(CHANNEL.id, {})).rejects.toThrow(/at least one field/)
  })
})
