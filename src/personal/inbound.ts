import {
  assertSomeField,
  encodePathSegment,
  toQueryString,
  type Requester,
} from '../request.js'
import type {
  CreateInboundChannelInput,
  DeleteInboundChannelResponse,
  InboundChannel,
  ListInboundChannelsInput,
  PaginatedInboundChannels,
  UpdateInboundChannelInput,
} from './types.js'

/**
 * Inbound capture channels — phone numbers (WhatsApp / SMS via Twilio) whose
 * messages and voice notes become memories. Requires the `inbound:read` /
 * `inbound:write` scopes.
 */
export class InboundChannelsResource {
  constructor(private readonly request: Requester) {}

  /**
   * `POST /v1/inbound/channels`. The response carries the plaintext
   * `verificationCode` (only here and on `regenerateCode`); the phone must
   * text it to activate the channel. The container defaults server-side to
   * `phone:<E.164>` — the client's `defaultContainerTag` is not applied.
   * 409 `CHANNEL_EXISTS` when the number is already registered.
   */
  async create(input: CreateInboundChannelInput): Promise<InboundChannel> {
    return this.request<InboundChannel>('POST', '/v1/inbound/channels', input)
  }

  /** `GET /v1/inbound/channels` — cursor paginated, codes never included. */
  async list(input: ListInboundChannelsInput = {}): Promise<PaginatedInboundChannels> {
    const query = toQueryString({ limit: input.limit, cursor: input.cursor })
    return this.request<PaginatedInboundChannels>(
      'GET',
      `/v1/inbound/channels${query}`,
    )
  }

  /** `GET /v1/inbound/channels/{id}`. 404 `CHANNEL_NOT_FOUND` when unknown. */
  async get(id: string): Promise<InboundChannel> {
    return this.request<InboundChannel>(
      'GET',
      `/v1/inbound/channels/${encodePathSegment(id)}`,
    )
  }

  /** `PATCH /v1/inbound/channels/{id}` — move the target container or disable / re-enable. */
  async update(id: string, input: UpdateInboundChannelInput): Promise<InboundChannel> {
    assertSomeField('Mnemo.inbound.channels.update', input)
    return this.request<InboundChannel>(
      'PATCH',
      `/v1/inbound/channels/${encodePathSegment(id)}`,
      input,
    )
  }

  /** `DELETE /v1/inbound/channels/{id}`. Captured memories are kept. */
  async delete(id: string): Promise<DeleteInboundChannelResponse> {
    return this.request<DeleteInboundChannelResponse>(
      'DELETE',
      `/v1/inbound/channels/${encodePathSegment(id)}`,
    )
  }

  /** `POST /v1/inbound/channels/{id}/regenerate-code` — new code, status back to `pending`. */
  async regenerateCode(id: string): Promise<InboundChannel> {
    return this.request<InboundChannel>(
      'POST',
      `/v1/inbound/channels/${encodePathSegment(id)}/regenerate-code`,
    )
  }
}

/** Namespace for inbound capture: `mnemo.inbound.channels.*`. */
export class InboundResource {
  readonly channels: InboundChannelsResource

  constructor(request: Requester) {
    this.channels = new InboundChannelsResource(request)
  }
}
