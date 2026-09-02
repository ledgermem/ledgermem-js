import {
  assertSomeField,
  encodePathSegment,
  toQueryString,
  type ContainerResolver,
  type Requester,
} from '../request.js'
import type {
  CreateReminderInput,
  ListRemindersInput,
  PaginatedReminders,
  Reminder,
  ReopenReminderInput,
  UpcomingReminders,
  UpcomingRemindersInput,
  UpdateReminderInput,
} from './types.js'

/**
 * Reminders — memories with `memoryType: "reminder"` and a `dueAt`. Requires
 * the `reminders:read` / `reminders:write` scopes on the API key.
 */
export class RemindersResource {
  constructor(
    private readonly request: Requester,
    private readonly resolveContainer: ContainerResolver,
  ) {}

  /**
   * `POST /v1/reminders`. Exactly one target is sent: `personSlug`, `scope`,
   * `containerTag`, or the client's `defaultContainerTag` (in that order).
   *
   * A timeout or dropped connection is only retried when `idempotencyKey` is
   * set — without it the server has no dedup key and a retry could create a
   * duplicate reminder.
   */
  async create(input: CreateReminderInput): Promise<Reminder> {
    const {
      personSlug,
      containerTag: _containerTag,
      scope: _scope,
      ...reminder
    } = input
    const target =
      personSlug !== undefined
        ? { personSlug }
        : this.resolveContainer('reminders.create', input)
    return this.request<Reminder>(
      'POST',
      '/v1/reminders',
      { ...reminder, ...target },
      { retryAmbiguousFailure: Boolean(input.idempotencyKey) },
    )
  }

  /**
   * `GET /v1/reminders` — open reminders by default, ordered by `dueAt`.
   * Workspace-wide unless `containerTag` / `containerType` narrows it; the
   * client's `defaultContainerTag` is deliberately not applied here.
   */
  async list(input: ListRemindersInput = {}): Promise<PaginatedReminders> {
    const query = toQueryString({
      status: input.status,
      dueAfter: input.dueAfter,
      dueBefore: input.dueBefore,
      days: input.days,
      containerType: input.containerType,
      containerTag: input.containerTag,
      limit: input.limit,
      cursor: input.cursor,
    })
    return this.request<PaginatedReminders>('GET', `/v1/reminders${query}`)
  }

  /**
   * `GET /v1/reminders/upcoming` — overdue / due today / upcoming buckets in
   * the caller's timezone, plus important dates inside the window.
   */
  async upcoming(input: UpcomingRemindersInput = {}): Promise<UpcomingReminders> {
    const query = toQueryString({
      days: input.days,
      timezone: input.timezone,
      containerType: input.containerType,
      containerTag: input.containerTag,
      limit: input.limit,
    })
    return this.request<UpcomingReminders>(
      'GET',
      `/v1/reminders/upcoming${query}`,
    )
  }

  /** `PATCH /v1/reminders/{memoryId}` — reschedule or edit. No container needed; ids are tenant-unique. */
  async update(memoryId: string, input: UpdateReminderInput): Promise<Reminder> {
    assertSomeField('Mnemo.reminders.update', input)
    return this.request<Reminder>(
      'PATCH',
      `/v1/reminders/${encodePathSegment(memoryId)}`,
      input,
    )
  }

  /** `POST /v1/reminders/{memoryId}/complete` — clears `dueAt`, stamps `completedAt`. 409 when already completed. */
  async complete(memoryId: string): Promise<Reminder> {
    return this.request<Reminder>(
      'POST',
      `/v1/reminders/${encodePathSegment(memoryId)}/complete`,
    )
  }

  /** `POST /v1/reminders/{memoryId}/reopen` — sets a new `dueAt` on a completed reminder. */
  async reopen(memoryId: string, input: ReopenReminderInput): Promise<Reminder> {
    return this.request<Reminder>(
      'POST',
      `/v1/reminders/${encodePathSegment(memoryId)}/reopen`,
      input,
    )
  }
}
