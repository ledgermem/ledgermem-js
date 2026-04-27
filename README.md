# @ledgermem/memory

Official TypeScript / JavaScript SDK for [LedgerMem Memory](https://proofly.dev) — long-term memory infrastructure for AI agents.

```bash
npm install @ledgermem/memory
```

Zero runtime dependencies. Works in Node 18+, Bun, Deno, browsers, Cloudflare Workers, and any other modern JS runtime with `fetch`.

## Quickstart

```ts
import { LedgerMem } from '@ledgermem/memory'

const memory = new LedgerMem({
  apiKey: process.env.LEDGERMEM_API_KEY!,
  workspaceId: process.env.LEDGERMEM_WORKSPACE_ID!,
})

// Store an atomic fact
await memory.add({ content: 'User prefers Japanese short-grain rice for onigiri.' })

// Retrieve relevant facts
const { hits } = await memory.search({ query: 'what kind of rice does the user like?' })
for (const hit of hits) {
  console.log(hit.score.toFixed(2), hit.content)
}
```

## API surface

| Method | Purpose |
|---|---|
| `search({ query, limit?, actorId? })` | Hybrid 7-strategy retrieval. Returns `SearchResponse`. |
| `add({ content, metadata?, actorId? })` | Store an atomic fact. Returns `Memory`. |
| `update(id, { content?, metadata? })` | Patch existing memory. |
| `delete(id)` | Remove a memory. |
| `list({ limit?, cursor?, actorId? })` | Cursor-paginated list. |

## Errors

All HTTP failures throw `LedgerMemHTTPError` with `.status` and `.body`. Aborted requests throw `LedgerMemTimeoutError`. Both inherit from `LedgerMemError`.

```ts
import { LedgerMem, LedgerMemHTTPError } from '@ledgermem/memory'

try {
  await memory.search({ query: 'rice' })
} catch (err) {
  if (err instanceof LedgerMemHTTPError && err.status === 401) {
    console.error('API key rejected:', err.body)
  } else {
    throw err
  }
}
```

## Configuration

| Option | Default | Notes |
|---|---|---|
| `apiKey` | (required) | from <https://app.proofly.dev/settings/api-keys> |
| `workspaceId` | (required) | from the dashboard URL |
| `actorId` | none | optional default actor scope |
| `baseUrl` | `https://api.proofly.dev` | override for self-hosted |
| `timeoutMs` | `30000` | per-request abort timeout |
| `fetch` | global `fetch` | inject for testing or proxying |

## Develop

```bash
npm install
npm test
npm run build
```

## License

MIT
