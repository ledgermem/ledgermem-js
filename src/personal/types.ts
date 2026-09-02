/**
 * Personal-memory types: people, reminders, timeline, daily brief, meetings,
 * inbound capture channels and memory merge. They track the public OpenAPI
 * DTOs (`people.dto.ts`, `reminders.dto.ts`, `timeline.dto.ts`, `brief.dto.ts`,
 * `meetings.dto.ts`, `inbound.dto.ts`, `memories.dto.ts`).
 */

import type { Memory, MemoryProvenance, Scope } from '../types.js'

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export type PersonImportantDate = {
  /** ≤ 60 chars. */
  label: string
  /** Calendar date, `YYYY-MM-DD`. */
  date: string
  /** Recurs every year on the same month and day (birthdays, anniversaries). */
  recurring: boolean
}

export type PersonContactFields = {
  relationship?: string | null
  /** Stored lowercased. */
  email?: string | null
  /** E.164; cosmetic spaces, dashes and parentheses are stripped by the API. */
  phone?: string | null
  company?: string | null
  /** ≤ 4000 chars. */
  notes?: string | null
  /** ≤ 20 entries. */
  importantDates?: PersonImportantDate[]
  /** ≤ 10 entries. */
  aliases?: string[]
}

export type CreatePersonInput = PersonContactFields & {
  /** ≤ 120 chars. */
  displayName: string
  /**
   * Explicit slug (`[a-z0-9]+(-[a-z0-9]+)*`, ≤ 64). Derived from `displayName`
   * when omitted. A collision returns 409 `PERSON_EXISTS`; retry with an
   * explicit slug. Slugs are immutable after creation.
   */
  slug?: string
}

/** All fields optional; an explicit `null` clears a field. */
export type UpdatePersonInput = PersonContactFields & {
  displayName?: string
  /** `true` archives the person (hidden from lists and reads); `false` restores. */
  archived?: boolean
}

export type Person = {
  slug: string
  /** Container tag, `person:<slug>`. */
  tag: string
  containerId: string
  displayName: string
  relationship: string | null
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  importantDates: PersonImportantDate[]
  aliases: string[]
  archivedAt: string | null
  /** Live memories in the person container. */
  memoryCount: number
  /** Open reminders in the person container. */
  openReminderCount: number
  nextReminderAt: string | null
  createdAt: string
  updatedAt: string
}

export type ListPeopleInput = {
  limit?: number
  cursor?: string
  /** Case-insensitive match on display name, or substring of the email. ≤ 120 chars. */
  q?: string
  /** Include archived people. Defaults to false. */
  includeArchived?: boolean
}

export type PaginatedPeople = {
  items: Person[]
  nextCursor: string | null
  total: number
}

export type ArchivePersonOptions = {
  /**
   * Also soft-delete every memory in the person container (max 500, else
   * 409 `TOO_MANY_MEMORIES`). Defaults to false.
   */
  deleteMemories?: boolean
}

export type ArchivePersonResponse = {
  slug: string
  archived: true
  memoriesDeleted: number
}

export type PersonSummaryOptions = {
  /** Question to answer over this person's memories. Defaults to a general summary. ≤ 2000 chars. */
  q?: string
}

export type AnswerCitation = {
  type: string
  score: number
  content: string
  /** Id of the cited memory, document or fact. */
  sourceId?: string
  title?: string
  url?: string
}

export type PersonSummary = {
  slug: string
  /** Reader answer; empty when abstained. */
  answer: string
  citations: AnswerCitation[]
  /** true when nothing in the person's memories answers the question, or the reader timed out. */
  abstained: boolean
  openReminders: Reminder[]
  recentMemories: Memory[]
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export type ReminderPerson = {
  slug: string
  displayName: string
}

/** A memory with `memoryType: "reminder"` plus reminder bookkeeping. */
export type Reminder = Memory & {
  completedAt: string | null
  /** The person the reminder is filed under, when its container is a person. */
  person: ReminderPerson | null
}

export type CreateReminderInput = {
  /** ≤ 4000 chars. */
  content: string
  /** ISO 8601 due time. */
  dueAt: string
  /**
   * File the reminder in this person's container. Exactly one of `personSlug`,
   * `containerTag` or `scope` is sent; when none is given the client's
   * `defaultContainerTag` applies.
   */
  personSlug?: string
  containerTag?: string
  scope?: Scope
  /** Natural idempotency key, unique per container; a repeat returns the existing reminder. ≤ 200 chars. */
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

export type ReminderStatus = 'open' | 'completed' | 'all'

export type ListRemindersInput = {
  /** Defaults to `"open"`. */
  status?: ReminderStatus
  /** Only reminders due at or after this ISO 8601 instant. */
  dueAfter?: string
  /** Only reminders due at or before this ISO 8601 instant. */
  dueBefore?: string
  /** Shorthand for `dueBefore = now + days` (1..365). */
  days?: number
  /** Only reminders whose container has this type (e.g. `"person"`). */
  containerType?: string
  /** Restrict to one container. Reminders are workspace-wide when omitted. */
  containerTag?: string
  /** ≤ 100. */
  limit?: number
  cursor?: string
}

export type PaginatedReminders = {
  items: Reminder[]
  nextCursor: string | null
  total: number
}

export type UpcomingRemindersInput = {
  /** 1..90, defaults to 7. */
  days?: number
  /** IANA zone used to bucket reminders into overdue / today / upcoming. Defaults to UTC. */
  timezone?: string
  containerType?: string
  /** Restrict to one container. Workspace-wide when omitted. */
  containerTag?: string
  /** ≤ 100. */
  limit?: number
}

export type ImportantDate = {
  personSlug: string
  displayName: string
  label: string
  /** The occurrence inside the window, `YYYY-MM-DD`. */
  date: string
  /** Days from today (in the requested timezone) to the occurrence. */
  daysUntil: number
  recurring: boolean
}

export type ReminderBuckets = {
  /** Due before today (local day). */
  overdue: Reminder[]
  /** Due within today (local day). */
  dueToday: Reminder[]
  /** Due after today, within the window. */
  upcoming: Reminder[]
}

export type UpcomingReminders = ReminderBuckets & {
  importantDates: ImportantDate[]
  generatedAt: string
  timezone: string
}

export type UpdateReminderInput = {
  content?: string
  /** Reschedule. Use `complete()` to close a reminder. */
  dueAt?: string
  /** Merged into the stored metadata; `completedAt` / `originalDueAt` are managed by the server. */
  metadata?: Record<string, unknown>
}

export type ReopenReminderInput = {
  /** ISO 8601 due time. */
  dueAt: string
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export type TimelineItemType = 'memory' | 'reminder' | 'document' | 'event'

export type TimelineDirection = 'desc' | 'asc'

export type TimelineInput = {
  containerTag?: string
  scope?: Scope
  /** Only items that occurred at or after this ISO 8601 instant. */
  from?: string
  /** Only items that occurred at or before this ISO 8601 instant. */
  to?: string
  /** Item types to include. Defaults to `memory, reminder, document` (`event` is opt-in). */
  types?: TimelineItemType[]
  /** `desc` = newest first (default), `asc` = oldest first. */
  direction?: TimelineDirection
  limit?: number
  cursor?: string
}

export type TimelineItemMeta = {
  memoryType?: string
  dueAt?: string | null
  contentType?: string
  /** Connector provider slug for connector-synced documents. */
  provider?: string
  /** Document ingestion status. */
  status?: string
  itemUpdatedAt?: string | null
  eventType?: string
  actorId?: string | null
  documentId?: string
  memoryId?: string
}

export type TimelineItem = {
  /** Composite id `${type}:${refId}`, unique within the stream. */
  id: string
  type: TimelineItemType
  /** Underlying memory / document / event id. */
  refId: string
  occurredAt: string
  title: string
  /** Up to 280 chars of body text. */
  snippet: string | null
  containerTag: string
  createdBy: MemoryProvenance | null
  meta: TimelineItemMeta
}

export type TimelineContainer = {
  tag: string
  containerType: string
  displayName: string | null
}

export type Timeline = {
  items: TimelineItem[]
  nextCursor: string | null
  /** The resolved container, or null when no such container exists yet (items is then empty). */
  container: TimelineContainer | null
  range: { from: string | null; to: string | null }
}

// ---------------------------------------------------------------------------
// Daily brief
// ---------------------------------------------------------------------------

export type BriefSection = 'core' | 'followUps' | 'meetings'

export type BriefInput = {
  containerTag?: string
  scope?: Scope
  /** IANA time zone that defines "today". Defaults to UTC; unknown zones return 400 `INVALID_TIMEZONE`. */
  timezone?: string
  /** How many days ahead the "coming up" reminders and important dates reach (1..30, default 7). */
  days?: number
  /** Sections to compute. Defaults to all. */
  sections?: BriefSection[]
}

export type GetBriefInput = BriefInput & {
  /** Local calendar day to brief, `YYYY-MM-DD`. Defaults to today in `timezone`. */
  date?: string
}

export type BriefFollowUps = {
  answer: string
  citations: AnswerCitation[]
  abstained: boolean
  /** true when served from the follow-ups cache. */
  cached: boolean
}

export type DailyBrief = {
  /** The briefed local day, `YYYY-MM-DD`. */
  date: string
  timezone: string
  generatedAt: string
  scope: { kind: 'workspace' | 'container'; containerTag: string | null }
  /** Null unless the `core` section was requested. */
  reminders: ReminderBuckets | null
  importantDates: ImportantDate[] | null
  /** Newest non-reminder memories of the window (max 20). */
  recentMemories: Memory[] | null
  counts: { memoriesLast24h: number; documentsLast24h: number } | null
  /** Null when not requested, or when the reader timed out / was over quota. */
  followUps: BriefFollowUps | null
  /** Null when not requested, when meetings are disabled, or when no calendar is connected. */
  meetings: Meeting[] | null
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export type MeetingPersonRef = {
  slug: string
  displayName: string
}

export type MeetingAttendee = {
  email: string | null
  name: string | null
  /** Google responseStatus: needsAction | declined | tentative | accepted. */
  responseStatus: string | null
  /** true when this attendee is the calendar owner. */
  self: boolean
  /** The workspace person whose stored email matches this attendee, when one exists. */
  person: MeetingPersonRef | null
}

export type Meeting = {
  /** SourceDocument id of the calendar event. */
  documentId: string
  eventId: string | null
  title: string
  /** RFC 3339 date-time for timed events, `YYYY-MM-DD` for all-day events. */
  start: string | null
  /** RFC 3339 date-time, or the EXCLUSIVE end date for all-day events. */
  end: string | null
  isAllDay: boolean
  /** confirmed | tentative. */
  status: string | null
  htmlLink: string | null
  location: string | null
  organizer: { email: string | null; name: string | null } | null
  attendees: MeetingAttendee[]
  /** The calendar connection's container tag. */
  containerTag: string
  connectionId: string | null
  attendeeSource: 'metadata' | 'contentText' | 'none'
}

export type MeetingConnection = {
  id: string
  containerTag: string
  /** pending | active | paused | error | revoked. */
  status: string
  lastSyncAt: string | null
}

export type UpcomingMeetingsInput = {
  /** Horizon in days from now (1..30, default 7). */
  days?: number
  /** ≤ 100, default 50. */
  limit?: number
  cursor?: string
  /** Restrict to one Google Calendar connection's container. */
  containerTag?: string
}

export type UpcomingMeetings = {
  items: Meeting[]
  nextCursor: string | null
  /** Calendar connections in the workspace; empty when none is connected. */
  connections: MeetingConnection[]
}

export type MeetingBriefOptions = {
  /** Question to answer over the meeting container and the matched people. Defaults to a pre-meeting brief. */
  q?: string
}

export type MeetingBriefPerson = {
  slug: string
  displayName: string
  relationship: string | null
  openReminders: Reminder[]
  recentMemories: Memory[]
}

export type MeetingBrief = Meeting & {
  /** Null when the reader did not respond within the time budget or failed. */
  brief: {
    answer: string
    citations: AnswerCitation[]
    abstained: boolean
    cached: boolean
  } | null
  people: MeetingBriefPerson[]
  /** Up to 5 past meetings sharing at least one attendee, newest first. */
  previousMeetings: Array<{ documentId: string; title: string; start: string | null }>
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Inbound capture channels (WhatsApp / SMS via Twilio)
// ---------------------------------------------------------------------------

export type InboundChannelStatus = 'pending' | 'active' | 'disabled'

export type CreateInboundChannelInput = {
  /** Phone number that will send notes, in E.164 (cosmetic characters are stripped). ≤ 20 chars. */
  phone: string
  /** Container that receives every captured note. Defaults to `phone:<E.164>` server-side. */
  containerTag?: string
  scope?: Scope
}

export type UpdateInboundChannelInput = {
  containerTag?: string
  /** Disable or re-enable a channel. A pending channel activates by texting its code, not here. */
  status?: 'active' | 'disabled'
}

export type InboundChannel = {
  id: string
  provider: string
  /** Masked sender number (`+1•••••1234`). The full number is never returned. */
  phoneMasked: string
  containerTag: string
  userId: string | null
  status: InboundChannelStatus
  /** Six-digit verification code the phone must send. Present only on create and regenerateCode. */
  verificationCode?: string
  verifiedAt: string | null
  lastMessageAt: string | null
  /** Messaging webhook URL to paste into the Twilio console. */
  webhookUrl: string | null
  /** SMS number to text. */
  inboundNumber: string | null
  /** WhatsApp sender number. */
  whatsappSender: string | null
  /** Join word for the Twilio WhatsApp sandbox, when a sandbox sender is in use. */
  sandboxJoinWord: string | null
  createdAt: string
}

export type ListInboundChannelsInput = {
  limit?: number
  cursor?: string
}

export type PaginatedInboundChannels = {
  items: InboundChannel[]
  nextCursor: string | null
  total: number
}

export type DeleteInboundChannelResponse = {
  id: string
  deleted: boolean
}

// ---------------------------------------------------------------------------
// Memory merge
// ---------------------------------------------------------------------------

export type MergeMemoriesInput = {
  /** Container holding every memory in `ids`. Falls back to the client's `defaultContainerTag`. */
  containerTag?: string
  scope?: Scope
  /** Memory ids to merge (2..20, unique, all in the same container). */
  ids: string[]
  /**
   * Survivor id. Must be one of `ids`; it keeps its id and gains the merge
   * metadata. Omit to create a new merged memory from `content`.
   */
  into?: string
  /** Merged text (≤ 4000). Required when `into` is omitted; optional override otherwise. */
  content?: string
  /** memoryType of the survivor. Defaults to `"memory"` for a newly created survivor. */
  memoryType?: string
  /** Extra metadata for the survivor, merged over its existing metadata. */
  metadata?: Record<string, unknown>
  /** Natural idempotency key (≤ 200). Defaults to a hash of the sorted ids. */
  mergeKey?: string
}

export type MergeMemoriesResponse = {
  /** The surviving memory. */
  memory: Memory
  /** Source ids folded into the survivor by this merge. */
  mergedFromIds: string[]
  /** Source ids soft-deleted (restorable) by this merge. */
  deletedIds: string[]
  /** true when this request replayed an already-completed merge with the same mergeKey. */
  replayed: boolean
}
