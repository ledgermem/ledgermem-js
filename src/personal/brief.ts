import {
  containerQuery,
  toQueryString,
  type ContainerResolver,
  type Requester,
} from '../request.js'
import type { BriefInput, DailyBrief, GetBriefInput } from './types.js'

/**
 * Daily Brief — reminders due, important dates, recent captures, open
 * follow-ups and today's meetings for one container. Requires the
 * `brief:read` scope; the `followUps` section is metered as an answer call.
 */
export class BriefResource {
  constructor(
    private readonly request: Requester,
    private readonly resolveContainer: ContainerResolver,
  ) {}

  /** `GET /v1/brief` for today in `timezone` (UTC by default). */
  async today(input: BriefInput = {}): Promise<DailyBrief> {
    return this.get(input)
  }

  /**
   * `GET /v1/brief` for a specific local day (`date: 'YYYY-MM-DD'`). Requires
   * a container — pass `containerTag` or `scope`, or set `defaultContainerTag`
   * on the client.
   */
  async get(input: GetBriefInput = {}): Promise<DailyBrief> {
    const container = this.resolveContainer('brief.get', input)
    const query = toQueryString({
      ...containerQuery(container),
      date: input.date,
      timezone: input.timezone,
      days: input.days,
      sections:
        input.sections && input.sections.length > 0
          ? input.sections.join(',')
          : undefined,
    })
    return this.request<DailyBrief>('GET', `/v1/brief${query}`)
  }
}
