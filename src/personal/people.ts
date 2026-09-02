import {
  assertSomeField,
  encodePathSegment,
  toQueryString,
  type Requester,
} from '../request.js'
import type {
  ArchivePersonOptions,
  ArchivePersonResponse,
  CreatePersonInput,
  ListPeopleInput,
  PaginatedPeople,
  Person,
  PersonSummary,
  PersonSummaryOptions,
  UpdatePersonInput,
} from './types.js'

/**
 * People — one memory container per person (`person:<slug>`) with contact
 * details, important dates and reminders. Requires the `people:read` /
 * `people:write` scopes on the API key.
 */
export class PeopleResource {
  constructor(private readonly request: Requester) {}

  /** `POST /v1/people`. 409 `PERSON_EXISTS` when the slug is taken. */
  async create(input: CreatePersonInput): Promise<Person> {
    return this.request<Person>('POST', '/v1/people', input)
  }

  /** `GET /v1/people` — newest first, cursor paginated; archived people hidden unless `includeArchived`. */
  async list(input: ListPeopleInput = {}): Promise<PaginatedPeople> {
    const query = toQueryString({
      q: input.q,
      includeArchived: input.includeArchived,
      limit: input.limit,
      cursor: input.cursor,
    })
    return this.request<PaginatedPeople>('GET', `/v1/people${query}`)
  }

  /** `GET /v1/people/{slug}`. 404 `PERSON_NOT_FOUND` when missing or archived. */
  async get(slug: string): Promise<Person> {
    return this.request<Person>('GET', `/v1/people/${encodePathSegment(slug)}`)
  }

  /** `PATCH /v1/people/{slug}`. An explicit `null` clears a field; `archived` toggles visibility. */
  async update(slug: string, input: UpdatePersonInput): Promise<Person> {
    assertSomeField('Mnemo.people.update', input)
    return this.request<Person>(
      'PATCH',
      `/v1/people/${encodePathSegment(slug)}`,
      input,
    )
  }

  /**
   * `DELETE /v1/people/{slug}` — archives the person (the container and its
   * event stream are kept). Pass `deleteMemories: true` to also soft-delete
   * its memories (max 500, else 409 `TOO_MANY_MEMORIES`).
   */
  async archive(
    slug: string,
    options: ArchivePersonOptions = {},
  ): Promise<ArchivePersonResponse> {
    const query = toQueryString({
      deleteMemories: options.deleteMemories === true ? true : undefined,
    })
    return this.request<ArchivePersonResponse>(
      'DELETE',
      `/v1/people/${encodePathSegment(slug)}${query}`,
    )
  }

  /**
   * `GET /v1/people/{slug}/summary` — reader answer over the person's
   * memories plus open reminders and recent memories. Needs `answer:read` and
   * is metered as an answer call.
   */
  async summary(
    slug: string,
    options: PersonSummaryOptions = {},
  ): Promise<PersonSummary> {
    const query = toQueryString({ q: options.q })
    return this.request<PersonSummary>(
      'GET',
      `/v1/people/${encodePathSegment(slug)}/summary${query}`,
    )
  }
}
