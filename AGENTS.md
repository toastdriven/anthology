
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

---

## Project: anthology

**v0.1.0-alpha** | Full-text search engine | License: BSD-3-Clause

### Core design intent

Anthology is designed to be used in three distinct modes, all from the same package:

- **Embeddable library** — import `SearchEngine`, indexes, tokenizers, and preprocessors directly into any Bun/TypeScript project. No HTTP layer involved.
- **Standalone HTTP server** — run `bun src/server.ts` (via `import.meta.main`) or call `makeServer({})` to get a fully wired REST API with sane defaults.
- **CLI** — run the `anthology` binary (or `bun anthology.ts`); subcommands dispatch to server or future tooling.

`index.ts` is the public API surface for all three modes — pure re-exports, no side effects on import. Nothing executes unless the caller explicitly calls it.

### Architecture Overview

The engine is built around pluggable interfaces (`IIndex`, `ITokenizer`, `IPreprocessorPlugin`, `IDocumentStore`, `IScorer`) composed by a `SearchEngine` orchestrator. The HTTP server and CLI layers are functional.

### Source layout

```
anthology.ts             # CLI binary shim (» src/cli.ts#run)
index.ts                 # Public API — pure re-exports, no side effects
src/
  engine.ts              # SearchEngine orchestrator
  preprocessor.ts        # Preprocessor plugin registry
  context.ts             # ViewContext type ({ engine: SearchEngine })
  interfaces.ts          # All interfaces (IIndex, ITokenizer, IPreprocessorPlugin, IDocumentStore, IScorer)
  types.ts               # Core types (Document, Vector, TermVector, Token, Result)
  constants.ts           # VERSION, QUERY_DOCUMENT, CONTENT_TYPE_PLAIN, DEFAULT_HOSTNAME, DEFAULT_PORT, PUNCTUATION, ENGLISH_STOP_WORDS
  server.ts              # makeServer() factory + import.meta.main direct-run guard
  cli.ts                 # run(args) — subcommand dispatch; "serve" is the default
  indexes/
    in-memory.ts         # InMemoryIndex
    json.ts              # JSONIndex (persistent, dirty-flag save/load)
  tokenizers/
    simple.ts            # SimpleTokenizer
    snowball.ts          # SnowballTokenizer (stub)
  preprocessors/
    html.ts              # HTMLPreprocessor
  documents/
    in-memory.ts         # InMemoryDocumentStore
    json.ts              # JSONDocumentStore (WIP — storagePath/isDirty not wired in constructor)
  scorers/
    simple.ts            # SimpleScorer (identity pass-through)
  utils/
    html.ts              # stripTags() utility
  views/
    documents.ts         # makeDocumentViews(ctx) — getDocument, updateDocument, deleteDocument
    search.ts            # makeSearchViews(ctx) — basicSearch
    stats.ts             # makeStatsViews(ctx) — generalStats
```

### Core Types (`src/types.ts`)

- **`Document`** — `{ id: DocId, content: string, contentType?: string }` — unit of indexing; `contentType` drives preprocessor dispatch (defaults to `"text/plain"`)
- **`Vector`** — `{ id: DocId, location: number }` — character offset of a term within a document
- **`TermVector`** — `{ term: string, vector: Vector }` — a term paired with its position
- **`Token`** — `{ word: string, offset: number }` — raw tokenizer output (internal use)
- **`Result`** — `{ id: DocId, docLength: number, locations: number[], score: number }` — scored search result (used by `IScorer`)

### Interfaces (`src/interfaces.ts`)

- **`IIndex`** — `getTerm`, `addTerm`, `deleteDocument`, `load`, `save`
- **`ITokenizer`** — `prepare(rawWord)`, `tokenize(document)`
- **`IDocumentStore`** — `getDocument`, `addDocument`, `deleteDocument` (async)
- **`IScorer`** — `score(result): Result`
- **`IPreprocessorPlugin`** — `contentTypes: string[]`, `process(document): Promise<Document>`

### SearchEngine (`src/engine.ts`)

Constructor: `new SearchEngine(index, tokenizer, preprocessor?)`

- `setUp()` — calls `index.load()` — must be called before use with persistent indexes
- `addDocument(doc)` — preprocesses → tokenizes → adds term vectors → saves index (all async)
- `search(query)` — synchronous; tokenizes query under the `QUERY_DOCUMENT` sentinel, counts per-doc term hits, returns `DocId[]` sorted by descending hit count
- `preprocessor` defaults to `new Preprocessor()` (no-op pass-through) if omitted

### Preprocessor registry (`src/preprocessor.ts`)

```ts
new Preprocessor()
  .register(new HTMLPreprocessor())
  .register(new MarkdownPreprocessor())
```

- `register(plugin)` — returns `this` for fluent chaining; registers the plugin under each of its `contentTypes`; last registration wins for a given content type
- `process(document)` — dispatches to the matching plugin by `document.contentType`; returns the document unchanged if no plugin matches
- Documents with no `contentType` are treated as `"text/plain"`

### Indexes (`src/indexes/`)

| Class | Backend | Persistence |
|---|---|---|
| `InMemoryIndex` | `Map<string, Vector[]>` | None (ephemeral); `load`/`save` are no-ops |
| `JSONIndex` | `Map<string, Vector[]>` | `{storagePath}/index.json` via `Bun.file`; dirty-flag guards `save()` |

Both deduplicate on `addTerm` (same `id` + `location` = no-op).

### Document stores (`src/documents/`)

| Class | Notes |
|---|---|
| `InMemoryDocumentStore` | Stores raw `Document` objects in a `Map`; fully functional |
| `JSONDocumentStore` | Mirrors `JSONIndex` pattern with serialize/deserialize/load/save; `storagePath` and `#isDirty` not yet initialised in constructor (WIP) |

Document stores are not yet wired into `SearchEngine` — they exist as standalone implementations.

### Tokenizers (`src/tokenizers/`)

| Class | Strategy |
|---|---|
| `SimpleTokenizer` | Lowercase → strip punctuation → suffix-strip (`es/ed/ing/s/able` regex) → stop-word filter |
| `SnowballTokenizer` | Empty stub |

`SimpleTokenizer` accepts optional `suffixRegex` and `stopWords` constructor overrides.

### Preprocessors (`src/preprocessors/`)

| Class | `contentTypes` | Strategy |
|---|---|---|
| `HTMLPreprocessor` | `["text/html"]` | Calls `stripTags()`, sets `contentType` to `"text/plain"` on output |

Stubs to add: `MarkdownPreprocessor`, `PDFPreprocessor`.

### Utilities (`src/utils/`)

- **`stripTags(content)`** (`src/utils/html.ts`) — regex-based HTML tag stripping; collapses/trims whitespace. Naive implementation, noted for future improvement.

### Scorers (`src/scorers/`)

- **`SimpleScorer`** — identity implementation; returns the `Result` unchanged. Placeholder for future TF-IDF or BM25 scoring.

### Constants (`src/constants.ts`)

- `VERSION` — current semver string
- `QUERY_DOCUMENT` (`"just-a-query"`) — sentinel doc id used when tokenizing search queries; never returned in results
- `CONTENT_TYPE_PLAIN` (`"text/plain"`) — default/fallback content type
- `PUNCTUATION` — regex used by `SimpleTokenizer` to strip punctuation
- `ENGLISH_STOP_WORDS` — default stop word list for `SimpleTokenizer`

### HTTP server (`src/server.ts`)

`makeServer(options: IServerOptions): Bun.Server<undefined>`

- `options.engine` — optional; defaults to `new SearchEngine(new InMemoryIndex(), new SimpleTokenizer(), new Preprocessor().register(new HTMLPreprocessor()))`
- `options.hostname` — defaults to `DEFAULT_HOSTNAME` (`"0.0.0.0"`)
- `options.port` — defaults to `DEFAULT_PORT` (`8080`)
- Constructs a `ViewContext`, instantiates all three view factories, wires them to `Bun.serve()` routes
- `import.meta.main` guard at the bottom allows `bun src/server.ts` for direct execution

**Routes:**

| Method | Path | Handler |
|---|---|---|
| GET | `/documents/:id` | `docViews.getDocument` |
| POST / PUT | `/documents/:id` | `docViews.updateDocument` |
| DELETE | `/documents/:id` | `docViews.deleteDocument` |
| GET | `/search/basic?q=` | `searchViews.basicSearch` |
| GET | `/stats` | `statsViews.generalStats` |
| GET | `/favicon.ico` | `Bun.file("./favicon.ico")` |
| (catch-all) | — | 404 JSON |

Commented-out future routes: `/search/autocomplete`, `/search/more-like-this/:id`.

### CLI (`src/cli.ts` + `anthology.ts`)

`anthology.ts` is the binary shim (`#!/usr/bin/env bun`); it calls `run(process.argv.slice(2))` and exits with the returned code.

`src/cli.ts` exports `run(args: string[]): Promise<number>` — subcommand dispatch:
- `serve` (default when no args given) — calls `makeServer({})`, logs the URL
- Unknown command — logs error, returns exit code 1

### Views (`src/views/`)

All view factories follow the pattern `makeXxxViews({ engine }: ViewContext)` and return an object of `async (req: Bun.BunRequest) => Promise<Response>` handlers. The `ViewContext` type (`src/context.ts`) currently carries only `engine`; add to it when views need additional dependencies (logger, config, etc.).

**`makeDocumentViews`:**
- `getDocument` — extracts `req.params.id`; 400 if missing, 200 + `{ success, document }` on success
- `updateDocument` — parses JSON body (`as unknown as Document`; validation is a FIXME); calls `engine.addDocument`; 202 + `{ success, id }`
- `deleteDocument` — extracts `req.params.id`; 400 if missing, 200 + `{ success, id }` on success

**`makeSearchViews`:**
- `basicSearch` — reads `?q=` from URL; 400 if absent/empty, 200 + `{ success, query, results }` on success

**`makeStatsViews`:**
- `generalStats` — returns `{ version }` (FIXMEs: add doc/term counts, consider Prometheus)

### `index.ts` — Public API

Pure re-exports only, no side effects. Organised in tiers:

```ts
// Tier 1: embeddable core
export { SearchEngine, Preprocessor };
export { InMemoryIndex, JSONIndex };
export { SimpleTokenizer };
export { HTMLPreprocessor };

// Tier 2: HTTP server (opt-in)
export { makeServer };

// Tier 3: types & interfaces (TypeScript embedders)
export type { Document, DocId, Vector, TermVector, Result };
export type { IIndex, ITokenizer, IPreprocessorPlugin, IDocumentStore, IScorer };
export type { ViewContext };
```

### WIP / Known issues

- **`src/documents/json.ts`** — `storagePath` and `#isDirty` referenced but not declared in the constructor; not yet wired into `SearchEngine`.
- **`engine.getDocument`** — currently delegates to `index.save()` (placeholder); needs a real `IDocumentStore` backing.
- **`updateDocument` validation** — body is cast `as unknown as Document` with no runtime validation; flagged as FIXME.
- **`/favicon.ico`** — `Bun.file("./favicon.ico")` will error at runtime until the file exists.
- **`generalStats`** — only returns `version`; doc/term counts not yet available.
- **`SnowballTokenizer`** — empty stub.
- Future routes (`/search/autocomplete`, `/search/more-like-this/:id`) commented out.

### Tests (`tests/`)

Run with `bun test` (125 tests, all passing).

`tests/helpers.ts` provides shared test utilities:
- `makeMockEngine(overrides)` — returns a `SearchEngine`-shaped mock with no-op defaults; individual methods overridable per-test
- `makeRequest(url, params, init)` — builds a `Bun.BunRequest`-compatible object via `Object.assign` on a native `Request`

| File | What it covers |
|---|---|
| `tests/engine.test.ts` | `SearchEngine` integration (matching, ranking, edge cases, dedup) + `HTMLPreprocessor` smoke tests |
| `tests/preprocessor.test.ts` | `Preprocessor` registry (register, dispatch, pass-through, chaining) |
| `tests/preprocessors/html.test.ts` | `HTMLPreprocessor` (contentTypes, output shape, content transformation, immutability) |
| `tests/utils/html.test.ts` | `stripTags` (tag variants, nesting, whitespace, edge cases) |
| `tests/indexes/in-memory.test.ts` | `InMemoryIndex` (getTerm, addTerm, deleteDocument) |
| `tests/indexes/json.test.ts` | `JSONIndex` (same API + serialize/deserialize/save/load/dirty-flag) |
| `tests/tokenizers/simple.test.ts` | `SimpleTokenizer` (prepare, tokenize, offsets, stop words, TermVector shape) |
| `tests/views/documents.test.ts` | `makeDocumentViews` (status codes, response shapes, engine delegation, mock engine) |
| `tests/views/search.test.ts` | `makeSearchViews` (validation, results, query echo, engine delegation) |
| `tests/views/stats.test.ts` | `makeStatsViews` (status, version in body, content-type header) |

### Task Runner

Uses `just` (see `justfile`):

```sh
just setup       # bun install
just test        # bun test
just lint        # tsc --noEmit
just format      # prettier write
```

### Import conventions

- Use explicit `.ts` extensions on local imports (e.g. `import { stripTags } from '../utils/html.ts'`). Required for Bun compatibility and editor resolution with `moduleResolution: bundler` + `allowImportingTsExtensions: true`.
