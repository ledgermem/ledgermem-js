import type { ContainerResolver, Requester } from '../request.js'
import type { MergeMemoriesInput, MergeMemoriesResponse } from './types.js'

const MERGE_MIN_IDS = 2
const MERGE_MAX_IDS = 20

/**
 * Memory operations that do not fit the top-level `add / get / update /
 * delete` verbs. Reached as `mnemo.memories.*`.
 */
export class MemoriesResource {
  constructor(
    private readonly request: Requester,
    private readonly resolveContainer: ContainerResolver,
  ) {}

  /**
   * `POST /v1/memories/merge` — fold 2..20 memories from one container into
   * a survivor. With `into`, that memory keeps its id and the others are
   * soft-deleted (restorable); without it a new memory is created from
   * `content`. Needs both `memories:write` and `memories:delete`. Replaying
   * the same `mergeKey` returns the existing result with `replayed: true`.
   */
  async merge(input: MergeMemoriesInput): Promise<MergeMemoriesResponse> {
    if (input.ids.length < MERGE_MIN_IDS || input.ids.length > MERGE_MAX_IDS) {
      throw new Error(
        `Mnemo.memories.merge: ids must contain between ${MERGE_MIN_IDS} and ${MERGE_MAX_IDS} memory ids`,
      )
    }
    if (input.into !== undefined && !input.ids.includes(input.into)) {
      throw new Error('Mnemo.memories.merge: into must be one of ids')
    }
    if (input.into === undefined && !input.content?.trim()) {
      throw new Error(
        'Mnemo.memories.merge: content is required when into is omitted',
      )
    }
    const container = this.resolveContainer('memories.merge', input)
    const { containerTag: _containerTag, scope: _scope, ...merge } = input
    return this.request<MergeMemoriesResponse>('POST', '/v1/memories/merge', {
      ...merge,
      ...container,
    })
  }
}
