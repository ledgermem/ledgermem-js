#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

const OPENAPI_URL = 'https://mnemohq.com/openapi.json'
/**
 * Local override for pre-release checks: point MNEMO_OPENAPI_PATH at an
 * openapi.json generated from the API branch the SDK is being built against.
 * Without it the LIVE spec is fetched, so the check only passes once the API
 * has deployed.
 */
const OPENAPI_PATH = process.env.MNEMO_OPENAPI_PATH

function fail(message) {
  throw new Error(`[contract] ${message}`)
}

function requirePath(spec, path, method) {
  if (!spec.paths?.[path]?.[method]) {
    fail(`missing ${method.toUpperCase()} ${path}`)
  }
}

function requireProperties(spec, schemaName, properties) {
  const schema = spec.components?.schemas?.[schemaName]
  if (!schema) fail(`missing schema ${schemaName}`)
  for (const property of properties) {
    if (!schema.properties?.[property]) {
      fail(`${schemaName} is missing property ${property}`)
    }
  }
}

function requireQueryParams(spec, path, method, names) {
  const params = spec.paths?.[path]?.[method]?.parameters ?? []
  const present = new Set(
    params.filter((p) => p.in === 'query').map((p) => p.name),
  )
  for (const name of names) {
    if (!present.has(name)) {
      fail(`${method.toUpperCase()} ${path} is missing query param ${name}`)
    }
  }
}

function requireEnum(actual, expected, label) {
  if (
    !Array.isArray(actual) ||
    expected.some((value) => !actual.includes(value))
  ) {
    fail(`unexpected ${label} enum: ${JSON.stringify(actual)}`)
  }
}

async function loadSpec() {
  if (OPENAPI_PATH) {
    return JSON.parse(await readFile(OPENAPI_PATH, 'utf8'))
  }
  const response = await fetch(OPENAPI_URL)
  if (!response.ok) {
    fail(`could not fetch ${OPENAPI_URL}: HTTP ${response.status}`)
  }
  return response.json()
}

const spec = await loadSpec()
const source = OPENAPI_PATH ?? OPENAPI_URL

for (const [path, method] of [
  ['/v1/memories', 'post'],
  ['/v1/memories', 'get'],
  ['/v1/memories/merge', 'post'],
  ['/v1/memories/{memoryId}', 'get'],
  ['/v1/memories/{memoryId}', 'patch'],
  ['/v1/memories/{memoryId}', 'delete'],
  ['/v1/memories/{memoryId}/restore', 'post'],
  ['/v1/documents', 'post'],
  ['/v1/documents/batch', 'post'],
  ['/v1/jobs', 'get'],
  ['/v1/jobs/{jobId}', 'get'],
  ['/v1/search', 'post'],
  ['/v1/profile', 'post'],
  ['/v1/media/youtube/estimate', 'post'],
  ['/v1/media/youtube', 'post'],
  ['/v1/media/youtube/{id}', 'get'],
  // Personal memory (0.6.0)
  ['/v1/people', 'post'],
  ['/v1/people', 'get'],
  ['/v1/people/{slug}', 'get'],
  ['/v1/people/{slug}', 'patch'],
  ['/v1/people/{slug}', 'delete'],
  ['/v1/people/{slug}/summary', 'get'],
  ['/v1/reminders', 'post'],
  ['/v1/reminders', 'get'],
  ['/v1/reminders/upcoming', 'get'],
  ['/v1/reminders/{memoryId}', 'patch'],
  ['/v1/reminders/{memoryId}/complete', 'post'],
  ['/v1/reminders/{memoryId}/reopen', 'post'],
  ['/v1/timeline', 'get'],
  ['/v1/brief', 'get'],
  ['/v1/meetings/upcoming', 'get'],
  ['/v1/meetings/{documentId}', 'get'],
  ['/v1/meetings/{documentId}/brief', 'get'],
  ['/v1/inbound/channels', 'post'],
  ['/v1/inbound/channels', 'get'],
  ['/v1/inbound/channels/{id}', 'get'],
  ['/v1/inbound/channels/{id}', 'patch'],
  ['/v1/inbound/channels/{id}', 'delete'],
  ['/v1/inbound/channels/{id}/regenerate-code', 'post'],
]) {
  requirePath(spec, path, method)
}

requireProperties(spec, 'MemoryItemDto', [
  'id',
  'content',
  'idempotencyKey',
  'memoryType',
  'dueAt',
  'metadata',
  'source',
])
requireProperties(spec, 'MemoryRecordDto', ['dueAt', 'createdBy'])
requireProperties(spec, 'MemoryProvenanceDto', ['kind', 'id', 'label'])
requireProperties(spec, 'UpdateMemoryDto', ['dueAt'])
requireProperties(spec, 'CreateMemoryScopeDto', ['type', 'id', 'tags'])
requireProperties(spec, 'SearchRequestDto', [
  'searchMode',
  'filters',
  'includeSources',
  'strategies',
  'excludeIds',
])
requireProperties(spec, 'CreateDocumentDto', [
  'content',
  'contentType',
  'customId',
  'metadata',
  'entityContext',
])
requireProperties(spec, 'EstimateYouTubeDto', ['url', 'mode'])
requireProperties(spec, 'CreateYouTubeIngestionDto', [
  'url',
  'mode',
  'scope',
  'containerTag',
])

requireQueryParams(spec, '/v1/memories', 'get', [
  'since',
  'until',
  'createdByKind',
  'memoryType',
])

requireProperties(spec, 'MergeMemoriesDto', [
  'scope',
  'containerTag',
  'ids',
  'into',
  'content',
  'memoryType',
  'metadata',
  'mergeKey',
])
requireProperties(spec, 'MergeMemoriesResponseDto', [
  'memory',
  'mergedFromIds',
  'deletedIds',
  'replayed',
])

requireProperties(spec, 'CreatePersonDto', [
  'displayName',
  'slug',
  'relationship',
  'email',
  'phone',
  'company',
  'notes',
  'importantDates',
  'aliases',
])
requireProperties(spec, 'UpdatePersonDto', ['displayName', 'archived'])
requireProperties(spec, 'PersonDto', [
  'slug',
  'tag',
  'containerId',
  'displayName',
  'importantDates',
  'aliases',
  'archivedAt',
  'memoryCount',
  'openReminderCount',
  'nextReminderAt',
])
requireProperties(spec, 'PersonImportantDateDto', ['label', 'date', 'recurring'])
requireProperties(spec, 'ListPeopleResponseDto', ['items', 'nextCursor', 'total'])
requireProperties(spec, 'ArchivePersonResponseDto', ['slug', 'archived', 'memoriesDeleted'])
requireProperties(spec, 'PersonSummaryDto', [
  'slug',
  'answer',
  'citations',
  'abstained',
  'openReminders',
  'recentMemories',
])
requireQueryParams(spec, '/v1/people', 'get', ['q', 'includeArchived', 'limit', 'cursor'])
requireQueryParams(spec, '/v1/people/{slug}', 'delete', ['deleteMemories'])
requireQueryParams(spec, '/v1/people/{slug}/summary', 'get', ['q'])

requireProperties(spec, 'CreateReminderDto', [
  'content',
  'dueAt',
  'personSlug',
  'containerTag',
  'scope',
  'idempotencyKey',
  'metadata',
])
requireProperties(spec, 'UpdateReminderDto', ['content', 'dueAt', 'metadata'])
requireProperties(spec, 'ReopenReminderDto', ['dueAt'])
requireProperties(spec, 'ReminderDto', ['dueAt', 'completedAt', 'person', 'createdBy'])
requireProperties(spec, 'ListRemindersResponseDto', ['items', 'nextCursor', 'total'])
requireProperties(spec, 'UpcomingRemindersResponseDto', [
  'overdue',
  'dueToday',
  'upcoming',
  'importantDates',
  'generatedAt',
  'timezone',
])
requireProperties(spec, 'ImportantDateDto', [
  'personSlug',
  'displayName',
  'label',
  'date',
  'daysUntil',
  'recurring',
])
requireQueryParams(spec, '/v1/reminders', 'get', [
  'status',
  'dueAfter',
  'dueBefore',
  'days',
  'containerType',
  'containerTag',
  'limit',
  'cursor',
])
requireQueryParams(spec, '/v1/reminders/upcoming', 'get', [
  'days',
  'timezone',
  'containerType',
  'containerTag',
  'limit',
])

requireProperties(spec, 'TimelineResponseDto', ['items', 'nextCursor', 'container', 'range'])
requireProperties(spec, 'TimelineItemDto', [
  'id',
  'type',
  'refId',
  'occurredAt',
  'title',
  'snippet',
  'containerTag',
  'createdBy',
  'meta',
])
requireQueryParams(spec, '/v1/timeline', 'get', [
  'containerTag',
  'scopeType',
  'scopeId',
  'from',
  'to',
  'types',
  'direction',
  'limit',
  'cursor',
])

requireProperties(spec, 'DailyBriefDto', [
  'date',
  'timezone',
  'generatedAt',
  'scope',
  'reminders',
  'importantDates',
  'recentMemories',
  'counts',
  'followUps',
  'meetings',
])
requireQueryParams(spec, '/v1/brief', 'get', [
  'containerTag',
  'scopeType',
  'scopeId',
  'date',
  'timezone',
  'days',
  'sections',
])

requireProperties(spec, 'ListUpcomingMeetingsResponseDto', ['items', 'nextCursor', 'connections'])
requireProperties(spec, 'MeetingDto', [
  'documentId',
  'eventId',
  'title',
  'start',
  'end',
  'isAllDay',
  'status',
  'attendees',
  'containerTag',
  'connectionId',
  'attendeeSource',
])
requireProperties(spec, 'MeetingAttendeeDto', ['email', 'name', 'responseStatus', 'self', 'person'])
requireProperties(spec, 'MeetingBriefDto', ['brief', 'people', 'previousMeetings', 'generatedAt'])
requireQueryParams(spec, '/v1/meetings/upcoming', 'get', ['days', 'limit', 'cursor', 'containerTag'])
requireQueryParams(spec, '/v1/meetings/{documentId}/brief', 'get', ['q'])

requireProperties(spec, 'CreateInboundChannelDto', ['phone', 'containerTag', 'scope'])
requireProperties(spec, 'UpdateInboundChannelDto', ['containerTag', 'status'])
requireProperties(spec, 'InboundChannelDto', [
  'id',
  'provider',
  'phoneMasked',
  'containerTag',
  'userId',
  'status',
  'verificationCode',
  'verifiedAt',
  'lastMessageAt',
  'webhookUrl',
  'inboundNumber',
  'whatsappSender',
  'sandboxJoinWord',
  'createdAt',
])
requireProperties(spec, 'ListInboundChannelsResponseDto', ['items', 'nextCursor', 'total'])
requireProperties(spec, 'DeleteInboundChannelResponseDto', ['id', 'deleted'])

const schemas = spec.components.schemas
requireEnum(
  schemas.SearchRequestDto.properties.searchMode.enum,
  ['hybrid', 'memories', 'documents'],
  'searchMode',
)
requireEnum(
  schemas.MemoryProvenanceDto.properties.kind.enum,
  ['api_key', 'mcp', 'user', 'connector', 'inbound', 'system'],
  'MemoryProvenanceDto.kind',
)
requireEnum(
  schemas.TimelineItemDto.properties.type.enum,
  ['memory', 'reminder', 'document', 'event'],
  'TimelineItemDto.type',
)
requireEnum(
  schemas.InboundChannelDto.properties.status.enum,
  ['pending', 'active', 'disabled'],
  'InboundChannelDto.status',
)

console.log(`[contract] PASS: getmnemo public surface matches ${source}`)
