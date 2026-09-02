import {
  containerQuery,
  toQueryString,
  type ContainerResolver,
  type Requester,
} from '../request.js'
import type { Timeline, TimelineInput } from './types.js'

/**
 * Timeline — a merged, day-by-day stream of memories, reminders, documents
 * and events for one container. Requires the `timeline:read` scope.
 */
export class TimelineResource {
  constructor(
    private readonly request: Requester,
    private readonly resolveContainer: ContainerResolver,
  ) {}

  /**
   * `GET /v1/timeline`. Requires a container — pass `containerTag` or
   * `scope`, or set `defaultContainerTag` on the client. An unknown container
   * yields `items: []` and `container: null`, never 404.
   */
  async get(input: TimelineInput = {}): Promise<Timeline> {
    const container = this.resolveContainer('timeline.get', input)
    const query = toQueryString({
      ...containerQuery(container),
      from: input.from,
      to: input.to,
      types: input.types && input.types.length > 0 ? input.types.join(',') : undefined,
      direction: input.direction,
      limit: input.limit,
      cursor: input.cursor,
    })
    return this.request<Timeline>('GET', `/v1/timeline${query}`)
  }
}
