# Changelog

All notable changes to `getmnemo` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-09-02

### Added

- `mnemo.people` — `create`, `list`, `get`, `update`, `archive`, `summary`
  over `/v1/people` (one memory container per person, `person:<slug>`).
- `mnemo.reminders` — `create`, `list`, `upcoming`, `update`, `complete`,
  `reopen` over `/v1/reminders`.
- `mnemo.timeline.get` — merged memory / reminder / document / event stream
  for one container (`GET /v1/timeline`).
- `mnemo.brief.today` / `mnemo.brief.get` — Daily Brief (`GET /v1/brief`).
- `mnemo.meetings` — `upcoming`, `get`, `brief` over `/v1/meetings`.
- `mnemo.inbound.channels` — `create`, `list`, `get`, `update`, `delete`,
  `regenerateCode` over `/v1/inbound/channels` (WhatsApp / SMS capture).
- `mnemo.memories.merge` — fold 2..20 memories into one survivor
  (`POST /v1/memories/merge`); validates `ids`, `into` and `content` before
  sending.
- `Memory` now carries `createdBy` (server-stamped provenance: kind, id,
  label) and `dueAt`.
- `add()` / `addMany()` items accept `dueAt` (makes the memory a reminder);
  `update()` accepts `dueAt` (`null` clears it).
- `list()` accepts `since`, `until`, `createdByKind` and `memoryType`.
- New exported types for every resource above, plus `MemoryProvenance`,
  `MemoryOriginKind`, `MemoryType`, `AnswerCitation`.
- `scripts/contract-check.mjs` honours `MNEMO_OPENAPI_PATH` to validate
  against a local `openapi.json` before the API is live.

### Changed

- User-Agent is now `getmnemo/0.6.0`.

### Unchanged (compatibility)

- No `x-workspace-id` header is sent; `workspaceId` stays a no-op.
- By-id memory routes (`get`, `update`, `delete`) keep sending the container
  on the query string exactly as in 0.5.x.
- `defaultContainerTag` applies to container-scoped calls only (`timeline`,
  `brief`, `memories.merge`, `reminders.create` without `personSlug`);
  workspace-wide lists (`reminders.list`, `reminders.upcoming`,
  `meetings.upcoming`) and `inbound.channels.create` never inject it.

## [0.5.1] - 2026-08

- Send the container scope on by-id memory routes.
