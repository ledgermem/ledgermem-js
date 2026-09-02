import {
  encodePathSegment,
  toQueryString,
  type Requester,
} from '../request.js'
import type {
  Meeting,
  MeetingBrief,
  MeetingBriefOptions,
  UpcomingMeetings,
  UpcomingMeetingsInput,
} from './types.js'

/**
 * Meeting Memory — upcoming Google Calendar meetings (synced through a
 * connector) with attendee ↔ person matching and a pre-meeting brief.
 * Requires the `meetings:read` scope; briefs also need `answer:read`.
 */
export class MeetingsResource {
  constructor(private readonly request: Requester) {}

  /**
   * `GET /v1/meetings/upcoming` — every connected calendar unless
   * `containerTag` narrows it to one connection. Never 404: with no
   * connection the response is `{ items: [], connections: [] }`.
   */
  async upcoming(input: UpcomingMeetingsInput = {}): Promise<UpcomingMeetings> {
    const query = toQueryString({
      days: input.days,
      limit: input.limit,
      cursor: input.cursor,
      containerTag: input.containerTag,
    })
    return this.request<UpcomingMeetings>('GET', `/v1/meetings/upcoming${query}`)
  }

  /** `GET /v1/meetings/{documentId}`. 404 `MEETING_NOT_FOUND` when unknown. */
  async get(documentId: string): Promise<Meeting> {
    return this.request<Meeting>(
      'GET',
      `/v1/meetings/${encodePathSegment(documentId)}`,
    )
  }

  /**
   * `GET /v1/meetings/{documentId}/brief` — the meeting plus a reader brief,
   * matched people (with open reminders and recent memories) and previous
   * meetings with the same attendees.
   */
  async brief(
    documentId: string,
    options: MeetingBriefOptions = {},
  ): Promise<MeetingBrief> {
    const query = toQueryString({ q: options.q })
    return this.request<MeetingBrief>(
      'GET',
      `/v1/meetings/${encodePathSegment(documentId)}/brief${query}`,
    )
  }
}
