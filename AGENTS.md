
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

**v0.1.0-alpha** | Full-text search engine — embeddable or stand-alone | License: BSD-3-Clause

### Architecture Overview

The engine is built around pluggable interfaces (`IIndex`, `ITokenizer`, `IPreprocessorPlugin`, `IDocumentStore`, `IScorer`) composed by a `SearchEngine` orchestrator. The HTTP server and CLI layers are stubs/WIP.

### Source layout

```
src/
  engine.ts              # SearchEngine orchestrator
  preprocessor.ts        # Preprocessor plugin registry
  interfaces.ts          # All interfaces (IIndex, ITokenizer, IPreprocessorPlugin, IDocumentStore, IScorer)
  types.ts               # Core types (Document, Vector, TermVector, Token, Result)
  constants.ts           # VERSION, QUERY_DOCUMENT, CONTENT_TYPE_PLAIN, PUNCTUATION, ENGLISH_STOP_WORDS
  indexes/
    in-memory.ts         # InMemoryIndex
    json.ts              # JSONIndex (persistent)
  tokenizers/
    simple.ts            # SimpleTokenizer
    snowball.ts          # SnowballTokenizer (stub)
  preprocessors/
    html.ts              # HTMLPreprocessor
  documents/
    in-memory.ts         # InMemoryDocumentStore
    json.ts              # JSONDocumentStore (WIP — storagePath/isDirty not wired yet)
  scorers/
    simple.ts            # SimpleScorer (identity/pass-through)
  utils/
    html.ts              # stripTags() utility
  server.ts              # Bun.serve() HTTP server (WIP/broken)
  cli.ts                 # CLI entry point (empty stub)
  views/
    documents.ts         # HTTP view stubs
    search.ts            # Empty
    stats.ts             # Empty
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

### WIP / Stub Layers

- **`src/server.ts`** — Partially wired `Bun.serve()` routes (`/documents/:id`, `/search/basic`, `/stats`). Broken: references non-existent `SimpleEnglishTokenizer`; missing comma syntax error; `engine.getDocument`/`engine.deleteDocument` don't exist on `SearchEngine`.
- **`src/documents/json.ts`** — `storagePath` and `#isDirty` referenced but not declared in constructor.
- **`src/views/documents.ts`** — Stub handlers with no engine import.
- **`src/views/search.ts`**, **`src/views/stats.ts`** — Empty files.
- **`src/cli.ts`** — Empty; `index.ts` and `anthology.ts` re-export a `run` function that doesn't exist yet.

### Tests (`tests/`)

Run with `bun test` (107 tests, all passing).

| File | What it covers |
|---|---|
| `tests/engine.test.ts` | `SearchEngine` integration (matching, ranking, edge cases, dedup) + `HTMLPreprocessor` smoke tests |
| `tests/preprocessor.test.ts` | `Preprocessor` registry (register, dispatch, pass-through, chaining) |
| `tests/preprocessors/html.test.ts` | `HTMLPreprocessor` (contentTypes, output shape, content transformation, immutability) |
| `tests/utils/html.test.ts` | `stripTags` (tag variants, nesting, whitespace, edge cases) |
| `tests/indexes/in-memory.test.ts` | `InMemoryIndex` (getTerm, addTerm, deleteDocument) |
| `tests/indexes/json.test.ts` | `JSONIndex` (same API + serialize/deserialize/save/load/dirty-flag) |
| `tests/tokenizers/simple.test.ts` | `SimpleTokenizer` (prepare, tokenize, offsets, stop words, TermVector shape) |

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
