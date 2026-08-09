
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

- **Embeddable library** — import `SearchEngine`, indexes, document stores, tokenizers, preprocessors/postprocessors, and the `Results`/`Result` types directly into any Bun/TypeScript project. No HTTP layer involved.
- **Standalone HTTP server** — run `bun src/server.ts` (via `import.meta.main`) or call `makeServer({})` to get a fully wired REST API with sane defaults.
- **CLI** — run the `anthology` binary (or `bun anthology.ts`); subcommands dispatch to server or future tooling.

`index.ts` is the public API surface for all three modes — pure re-exports, no side effects on import. Nothing executes unless the caller explicitly calls it.

### Architecture Overview

The engine is built around pluggable interfaces (`IIndex`, `ITokenizer`, `IPreprocessorPlugin`, `IPostprocessorPlugin`, `IDocumentStore`, `IScorer`) composed by a `SearchEngine` orchestrator. Documents now flow through: preprocess → tokenize → index → (on search) score → slice → postprocess. A real `IDocumentStore` is wired directly into the engine (previously standalone-only).

### Source layout

```
anthology.ts             # CLI binary shim (» src/cli.ts#run)
index.ts                 # Public API — pure re-exports, no side effects
src/
  engine.ts              # SearchEngine orchestrator (options-object constructor)
  preprocessor.ts        # Preprocessor plugin registry (content-type dispatch)
  postprocessor.ts       # Postprocessor plugin pipeline (result enrichment)
  interfaces.ts          # All interfaces (IIndex, ITokenizer, IPreprocessorPlugin, IPostprocessorPlugin, IDocumentStore, IScorer, IResult, ISearchEngine)
  types.ts               # Core types (DocId, Document, WordLocation, Vector, TermVector, Token, ViewContext)
  schemas.ts             # Zod runtime-validation schemas mirroring types.ts (DocumentSchema, VectorSchema, SerializedDocumentsSchema, SerializedIndexSchema)
  results.ts             # Result / Results — scored-result collection + iteration/slicing
  constants.ts           # VERSION, QUERY_DOCUMENT, DATA_ROOT, CONTENT_TYPE_PLAIN, DEFAULT_HOSTNAME, DEFAULT_PORT, PUNCTUATION, ENGLISH_STOP_WORDS
  server.ts              # makeServer() factory (async) + import.meta.main direct-run guard
  cli.ts                 # run(args) — subcommand dispatch; "serve" is the default
  indexes/
    in-memory.ts         # InMemoryIndex
    json.ts              # JSONIndex (persistent, dirty-flag save/load)
  tokenizers/
    simple.ts            # SimpleTokenizer
    snowball.ts          # empty stub file (no SnowballTokenizer implementation)
  preprocessors/
    html.ts              # HTMLPreprocessor
  postprocessors/
    highlights.ts        # empty stub file (no implementation, not exported)
  documents/
    in-memory.ts         # InMemoryDocumentStore
    json.ts              # JSONDocumentStore (persistent, dirty-flag save/load; mirrors JSONIndex)
    fs.ts                # FilesystemDocumentStore — BROKEN, see Known issues
  scorers/
    simple.ts            # SimpleScorer (term-coverage popularity score)
  utils/
    fs.ts                # ensurePath() — recursive mkdir helper for persistent backends
    hash.ts              # createHash() — Bun.hash.rapidhash-based hex digest
    html.ts              # stripTags() utility
  views/
    documents.ts         # makeDocumentViews(ctx) — getDocument, updateDocument, deleteDocument
    search.ts            # makeSearchViews(ctx) — basicSearch
    stats.ts             # makeStatsViews(ctx) — generalStats
scripts/
  playground.ts          # ad-hoc manual smoke-test script (In-Memory/JSON engine wiring examples)
  benchmarks/
    bench-utils.ts       # benchmark(), showResults(), trimScore() helpers
    shakespeare-inmem.ts # indexing/query benchmark against InMemoryIndex + InMemoryDocumentStore
    shakespeare-json.ts  # same benchmark against JSONIndex + JSONDocumentStore
```

### Core Types (`src/types.ts`)

- **`DocId`** — `string` alias for document identifiers
- **`Document`** — `{ id: DocId, content: string, contentType?: string }` — unit of indexing; `contentType` drives preprocessor dispatch (defaults to `"text/plain"`)
- **`WordLocation`** — `{ originalWord: string, location: number }` — the literal matched word + its character offset, attached to a `Result`
- **`Vector`** — `{ id: DocId, originalWord: string, location: number }` — a term occurrence: which document, the original (pre-stemmed) word, and its character offset
- **`TermVector`** — `{ term: string, vector: Vector }` — a normalized term paired with its occurrence
- **`Token`** — `{ word: string, offset: number }` — raw tokenizer output (internal use)
- **`ViewContext`** — `{ engine: ISearchEngine }` — the dependency bag threaded through all view factories (`makeXxxViews({ engine }: ViewContext)`). Previously lived in its own `src/context.ts` file; moved here since it's just a plain type, and `types.ts` is the established home for those. Add to it when views need additional dependencies (logger, config, etc.).

`Result`/`Results` (scored search results) now live in `src/results.ts`, not `types.ts`.

### Interfaces (`src/interfaces.ts`)

- **`IIndex`** — `length()`, `getTerm`, `addTerm` (async), `deleteDocument` (async), `clear()`, `load`, `save`
- **`ITokenizer`** — `prepare(rawWord)`, `tokenize(document)`
- **`IDocumentStore`** — `length()`, `getDocument`, `getDocumentLength(id)`, `addDocument`, `deleteDocument`, `clear()` (all async)
- **`IResult`** — `{ id, locations: WordLocation[], score, document?, docLength }` — the shape scorers/postprocessors operate on; implemented by `Result`
- **`IScorer`** — `score(result: IResult): Promise<IResult>`
- **`IPreprocessorPlugin`** — `name: string`, `contentTypes: string[]`, `process(document): Promise<Document>`
- **`IPostprocessorPlugin`** — `name: string`, `process(result: IResult): Promise<IResult>`
- **`ISearchEngine`** — `setUp()`, `clear()`, `indexSize()`, `documentStoreSize()`, `getDocument(id)`, `addDocument(document)`, `deleteDocument(id)`, `rawSearch(query)`, `search(query)` — the behavioral contract `SearchEngine` implements (`class SearchEngine implements ISearchEngine`); extracted so `ViewContext`/views and test mocks (`tests/helpers.ts`'s `makeMockEngine`) can depend on an interface instead of the concrete class, and so `types.ts`'s `ViewContext` doesn't need to import `engine.ts` directly

Note `IPreprocessorPlugin.name` is now a required field — plain object literals used as ad-hoc plugins (e.g. in tests) must include it or fail type-checking (existing `tests/preprocessor.test.ts` doubles are stale on this point — see Tests section).

`interfaces.ts` and `types.ts` have a type-only circular import (`interfaces.ts` imports `Result`/`Results` from `results.ts` for `ISearchEngine`; `types.ts` imports `ISearchEngine` from `interfaces.ts` for `ViewContext`; `results.ts` imports `IDocumentStore`/`IResult`/`IScorer` from `interfaces.ts`). This is fine under `import type` — those imports are erased entirely at compile time, so there's no runtime cycle, and `bunx tsc --noEmit` confirms it type-checks cleanly.

### SearchEngine (`src/engine.ts`)

`class SearchEngine implements ISearchEngine` (see `src/interfaces.ts`). Constructor now takes a single **options object**, not positional args:

```ts
new SearchEngine({
  index?: IIndex,                 // default: new InMemoryIndex()
  tokenizer?: ITokenizer,         // default: new SimpleTokenizer()
  preprocessor?: Preprocessor,    // default: new Preprocessor() (no-op pass-through)
  documentStore?: IDocumentStore, // default: new InMemoryDocumentStore()
  scorer?: IScorer,               // default: new SimpleScorer()
  postprocessor?: Postprocessor,  // default: new Postprocessor() (no-op pipeline)
})
```

- `setUp()` — calls both `index.load()` and `documentStore.load()`, so both `JSONIndex` and `JSONDocumentStore` load prior data on startup
- `clear()` — clears both the index and the document store; returns `true`
- `getDocument(id)` — delegates to `documentStore.getDocument(id)`
- `addDocument(doc)` — adds to the document store → preprocesses → tokenizes → adds term vectors to the index → saves the index (all async)
- `deleteDocument(id)` — deletes the document's term vectors from the index (via `IIndex.deleteDocument`, a full scan-and-filter over every term's vector list — see `InMemoryIndex`/`JSONIndex`) and then deletes it from the `IDocumentStore`. `JSONIndex.deleteDocument` also persists the change immediately (`await this.save()`).
- `rawSearch(query)` — tokenizes the query under the `QUERY_DOCUMENT` sentinel, gathers per-term vectors from the index into a `Results` collection, and scores them via the configured `IScorer`
- `search(query)` — awaits `rawSearch`, slices to the top 10, then runs each `Result` through the `Postprocessor` pipeline; returns `Promise<Result[]>` (sorted descending by `score`) — correctly annotated as such
- **`search()` is now `async`** (previously synchronous) and returns rich `Result` objects (`{ id, locations, score, document?, docLength }`), not bare `DocId[]` — callers must `await` it

### Preprocessor registry (`src/preprocessor.ts`)

```ts
new Preprocessor()
  .register(new HTMLPreprocessor())
  .register(new MarkdownPreprocessor())
```

- `register(plugin)` — returns `this` for fluent chaining; registers the plugin under each of its `contentTypes`; last registration wins for a given content type
- `process(document)` — dispatches to the matching plugin by `document.contentType`; returns the document unchanged if no plugin matches
- Documents with no `contentType` are treated as `"text/plain"`

### Postprocessor pipeline (`src/postprocessor.ts`)

```ts
new Postprocessor()
  .register(somePostprocessorPlugin) // e.g. a future HighlightsPostprocessor
```

- `register(plugin: IPostprocessorPlugin)` — returns `this` for fluent chaining; plugins run in registration order
- `process(result: IResult)` — `structuredClone`s the result, then threads it through every registered plugin in sequence, returning the final (possibly mutated/enriched) result
- With no plugins registered (the engine's default), `process()` is effectively an identity clone — invoked by `SearchEngine.search()` on every sliced result

### Results (`src/results.ts`)

- **`Result`** (`implements IResult`) — lightweight per-document match: `id`, `locations: WordLocation[]`, `score`, `docLength`, optional `document`
- **`Results`** — iterable/sliceable collection built up during search:
  - `addTermResults(docVectors: Vector[])` — merges term-vector hits into an internal `unscored: Map<DocId, IResult>`, fetching `docLength` from the `IDocumentStore` the first time a doc is seen
  - `scoreResults(scorer: IScorer)` — scores every unscored result, pushes into `results: Result[]`, sorts descending by `score` in place
  - `slice(start?, end?)` — returns a new `Results` wrapping a sliced copy of `results` (same `documentStore` reference)
  - `length` getter + `Symbol.iterator` — behaves like an array of `Result` for `for...of` / spread
  - FIXME (noted in source): scoring iterates/copies twice (`unscored` → `results`) for simplicity; not yet optimized for scale/memory

### Indexes (`src/indexes/`)

| Class | Backend | Persistence |
|---|---|---|
| `InMemoryIndex` | `Map<string, Vector[]>` | None (ephemeral); `load`/`save` are no-ops |
| `JSONIndex` | `Map<string, Vector[]>` | `{storagePath}/index.json` via `Bun.file`; dirty-flag guards `save()`; defaults `storagePath` to `${DATA_ROOT}/indexes` |

Both deduplicate on `addTerm` (same `id` + `location` = no-op) and implement `length()`/`clear()`.

### Document stores (`src/documents/`)

| Class | Notes |
|---|---|
| `InMemoryDocumentStore` | Stores raw `Document` objects in a `Map`; fully functional; wired into `SearchEngine` by default |
| `JSONDocumentStore` | Mirrors `JSONIndex` pattern with serialize/deserialize/load/save/dirty-flag; defaults `storagePath` to `${DATA_ROOT}/documents`; fully functional |
| `FilesystemDocumentStore` | **Broken** — see Known issues; not exported from `index.ts` |

Document stores are wired into `SearchEngine` via the `documentStore` constructor option (previously standalone-only, not connected to the engine at all).

### Runtime validation schemas (`src/schemas.ts`)

TypeScript types are erased at compile time — they provide zero runtime enforcement. `Bun.file(...).json()` returns `any`, so anything read back from a persisted `index.json` (via `JSONIndex.load()`/`JSONDocumentStore.load()`) is untrusted until it's actually validated, not just cast/annotated. `src/schemas.ts` uses [Zod](https://zod.dev/) (a `dependencies` entry, not just `devDependencies`) to provide that validation, mirroring the plain types in `types.ts`:

- **`DocumentSchema`** — mirrors `Document` (`id`, `content`, optional `contentType`)
- **`VectorSchema`** — mirrors `Vector` (`id`, `originalWord`, `location`)
- **`SerializedDocumentsSchema`** — `z.record(DocIdSchema, DocumentSchema)`, the on-disk shape for `JSONDocumentStore`
- **`SerializedIndexSchema`** — `z.record(z.string(), z.array(VectorSchema))`, the on-disk shape for `JSONIndex`
- A compile-time-only assertion block (`_AssertDocument`/`_AssertVector`, unused at runtime) fails `tsc` if a schema's inferred type (`z.infer<...>`) drifts out of structural alignment with the corresponding hand-written type in `types.ts` — a cheap guard against the two definitions silently diverging over time

Both `JSONIndex.load()` and `JSONDocumentStore.load()` call `.parse()` (not `.safeParse()`) on the raw JSON before handing it to `deserialize()` — malformed/corrupt persisted data now throws a descriptive `ZodError` right at the file-read boundary, instead of silently propagating bad shapes into the rest of the engine. This is a deliberate throw-on-invalid design (fail loud at startup) rather than swallow-and-default.

### Tokenizers (`src/tokenizers/`)

| Class | Strategy |
|---|---|
| `SimpleTokenizer` | Lowercase → strip punctuation → suffix-strip (`es/ed/ing/s/able` regex) → stop-word filter |
| `SnowballTokenizer` | Empty stub file (no implementation, not exported) |

`SimpleTokenizer` accepts optional `suffixRegex` and `stopWords` constructor overrides. `tokenize()` now also captures `originalWord` on each `Vector` (used for `WordLocation`/scoring), in addition to `location`.

### Preprocessors (`src/preprocessors/`)

| Class | `contentTypes` | Strategy |
|---|---|---|
| `HTMLPreprocessor` | `["text/html"]` | Calls `stripTags()`, sets `contentType` to `"text/plain"` on output |

Stubs to add: `MarkdownPreprocessor`, `PDFPreprocessor`.

### Postprocessors (`src/postprocessors/`)

- **`highlights.ts`** — empty stub file; no `HighlightsPostprocessor` class exists yet despite the filename. Not exported from `index.ts`.

### Utilities (`src/utils/`)

- **`stripTags(content)`** (`src/utils/html.ts`) — regex-based HTML tag stripping; collapses/trims whitespace. Naive implementation, noted for future improvement.
- **`ensurePath(path)`** (`src/utils/fs.ts`) — `async`, recursively `mkdir`s the given path via `node:fs/promises`; used by `JSONIndex`/`JSONDocumentStore` before read/write.
- **`createHash(toHash, hashLength = 16)`** (`src/utils/hash.ts`) — hex digest via `Bun.hash.rapidhash`, left-padded to 16 chars then truncated to `hashLength`. Not currently called anywhere in `src/`; exists for future doc-id/cache-key generation.

### Scorers (`src/scorers/`)

- **`SimpleScorer`** — computes `score = totalTermLength / docLength` (sum of matched `originalWord` lengths, divided by document length) — a basic "how much of the document is these terms" popularity metric. No longer an identity pass-through.

### Constants (`src/constants.ts`)

- `VERSION` — current semver string
- `QUERY_DOCUMENT` (`"just-a-query"`) — sentinel doc id used when tokenizing search queries; never returned in results
- `DATA_ROOT` (`"/var/log/anthology/data"`) — default root path for persistent backends (`JSONIndex`, `JSONDocumentStore`, `FilesystemDocumentStore`); each appends its own subdirectory
- `CONTENT_TYPE_PLAIN` (`"text/plain"`) — default/fallback content type
- `DEFAULT_HOSTNAME` / `DEFAULT_PORT` — HTTP server defaults (`"0.0.0.0"` / `8080`)
- `PUNCTUATION` — regex used by `SimpleTokenizer` to strip punctuation
- `ENGLISH_STOP_WORDS` — default stop word list for `SimpleTokenizer`

### HTTP server (`src/server.ts`)

`makeServer(options: IServerOptions): Promise<Bun.Server<undefined>>` — **now async**, and awaits `engine.setUp()` before wiring routes.

- `options.engine` — optional; defaults to `new SearchEngine({ index: new InMemoryIndex(), tokenizer: new SimpleTokenizer(), preprocessor: new Preprocessor().register(new HTMLPreprocessor()) })`. Typed as the concrete `SearchEngine` class, not `ISearchEngine` — `makeServer` needs to actually construct a default instance when none is passed, so it can't take the interface alone here (unlike the views, which only ever consume an already-constructed engine and so take `ViewContext`/`ISearchEngine`)
- `options.hostname` — defaults to `DEFAULT_HOSTNAME` (`"0.0.0.0"`)
- `options.port` — defaults to `DEFAULT_PORT` (`8080`)
- Constructs a `ViewContext` (`src/types.ts`), instantiates all three view factories, wires them to `Bun.serve()` routes
- `import.meta.main` guard at the bottom does `const server = await makeServer({})` — any caller of `makeServer` must `await` it

**Routes:**

| Method | Path | Handler |
|---|---|---|
| GET | `/documents/:id` | `docViews.getDocument` |
| POST / PUT | `/documents/:id` | `docViews.updateDocument` |
| DELETE | `/documents/:id` | `docViews.deleteDocument` |
| GET | `/search/basic?q=` | `searchViews.basicSearch` |
| GET | `/stats` | `statsViews.generalStats` |
| (catch-all) | — | 404 JSON |

Commented-out future routes: `/search/autocomplete`, `/search/more-like-this/:id`.

### CLI (`src/cli.ts` + `anthology.ts`)

`anthology.ts` is the binary shim (`#!/usr/bin/env bun`); it calls `run(process.argv.slice(2))` and exits with the returned code.

`src/cli.ts` exports `run(args: string[]): Promise<number>` — subcommand dispatch:
- `serve` (default when no args given) — `await`s `makeServer({})` and logs `` `Server running at ${server.url}...` ``.
- Unknown command — logs error, returns exit code 1

### Views (`src/views/`)

All view factories follow the pattern `makeXxxViews({ engine }: ViewContext)` and return an object of `async (req: Bun.BunRequest) => Promise<Response>` handlers. The `ViewContext` type (`src/types.ts`) currently carries only `engine`; add to it when views need additional dependencies (logger, config, etc.).

**`makeDocumentViews`:**
- `getDocument` — extracts `req.params.id`; 400 if missing, 200 + `{ success, document }` on success
- `updateDocument` — parses and validates the JSON body against `DocumentSchema` (see `src/schemas.ts`); 400 + `{ success: false, errors }` (per-field Zod issue messages, or a generic "invalid JSON" message if the body doesn't parse at all) on failure; otherwise calls `engine.addDocument`; 202 + `{ success, id }` on success
- `deleteDocument` — extracts `req.params.id`; 400 if missing, 200 + `{ success, id }` on success

**`makeSearchViews`:**
- `basicSearch` — reads `?q=` from URL; 400 if absent/empty; otherwise `await`s `engine.search(query)` and returns 200 + `{ success, query, results }` on success.

**`makeStatsViews`:**
- `generalStats` — returns `{ version, indexSize, indexedDocuments }` via `engine.indexSize()`/`engine.documentStoreSize()` (FIXME: other metrics could be Prometheus-instrumented)

### `index.ts` — Public API

Pure re-exports only, no side effects:

```ts
// Types & interfaces (for TypeScript embedders)
export type {
  DocId,
  Document,
  TermVector,
  Token,
  Vector,
  ViewContext,
  WordLocation,
} from "./src/types.ts";
export type {
  IDocumentStore,
  IIndex,
  IPreprocessorPlugin,
  IPostprocessorPlugin,
  IResult,
  IScorer,
  ISearchEngine,
  ITokenizer,
} from "./src/interfaces.ts";

// Core engine
export { SearchEngine } from "./src/engine.ts";
export { Preprocessor } from "./src/preprocessor.ts";
export { Postprocessor } from "./src/postprocessor.ts";

// Document backends
export { InMemoryDocumentStore } from "./src/documents/in-memory.ts";
export { JSONDocumentStore } from "./src/documents/json.ts";

// Index backends
export { InMemoryIndex } from "./src/indexes/in-memory.ts";
export { JSONIndex } from "./src/indexes/json.ts";

// Preprocessor plugins
export { HTMLPreprocessor } from "./src/preprocessors/html.ts";

// Results
export type {
  Result,
  Results,
} from "./src/results.ts";

// Scoring
export { SimpleScorer } from "./src/scorers/simple.ts";

// HTTP server (opt-in)
export { makeServer } from "./src/server.ts";

// Tokenizers
export {
  type SimpleTokenizerOptions,
  SimpleTokenizer,
} from "./src/tokenizers/simple.ts";
```

### Known issues (found via a full re-read of the current source)

These are real, verified breakages/regressions from the refactor — not just source FIXME comments:

- **`SnowballTokenizer`** and **`highlights.ts` postprocessor** — still empty stub files, no implementation.
- Future routes (`/search/autocomplete`, `/search/more-like-this/:id`) still commented out.

### Tests (`tests/`)

Run with `bun test`. **As of this writing, all 225 tests pass.** The suite was brought back in sync with the current source (options-object `SearchEngine` constructor, `async search()` returning `Result[]`, `originalWord` on vectors, `name` on preprocessor plugin doubles), and new coverage was added for previously-untested modules. Per project convention, tests assert **actual runtime behaviour**, including known bugs (documented inline with a comment pointing back to the relevant "Known issues" entry) — they are not written against the *intended* behaviour where the two diverge.

`tests/helpers.ts` provides shared test utilities:
- `makeMockEngine(overrides)` — returns an `ISearchEngine`-typed mock (`Partial<ISearchEngine>` overrides, honestly typed — no `as unknown as SearchEngine` cast needed now that `ISearchEngine` exists in `src/interfaces.ts`) with no-op defaults for all nine methods (`setUp`, `clear`, `indexSize`, `documentStoreSize`, `getDocument`, `addDocument`, `deleteDocument`, `rawSearch`, `search`); individual methods overridable per-test. `search` is `async` and returns `Promise<Result[]>`, matching the real engine's signature. `indexSize`/`documentStoreSize` default to resolving `0`. `rawSearch`'s default returns an empty `Results` backed by a throwaway `IDocumentStore` stub (only exercised if a test overrides `search` to call through to it, which none currently do).
- `makeRequest(url, params, init)` — builds a `Bun.BunRequest`-compatible object via `Object.assign` on a native `Request`.
- `makeResult(id, overrides)` — constructs a real `Result` instance and applies overrides, for use in mocked `search()` return values.

| File | What it covers | Status |
|---|---|---|
| `tests/engine.test.ts` | `SearchEngine` integration (matching, ranking, edge cases, dedup, addDocument, deleteDocument) + `HTMLPreprocessor` smoke tests | Rewritten for the options-object constructor and async `search()`; the local `search()` helper is now a plain passthrough (no cast needed — see Known issues, `engine.ts` return-type mismatch fixed). Coverage added for `deleteDocument()` removing a document from both the index and the document store (confirmed via a subsequent `search()` no longer returning it, and via `getDocument()` rejecting), and for deleting one document leaving others' searchability intact |
| `tests/preprocessor.test.ts` | `Preprocessor` registry (register, dispatch, pass-through, chaining) | Updated — plugin doubles now include the required `name` field |
| `tests/preprocessors/html.test.ts` | `HTMLPreprocessor` (contentTypes, output shape, content transformation, immutability) | Accurate |
| `tests/utils/html.test.ts` | `stripTags` (tag variants, nesting, whitespace, edge cases) | Accurate |
| `tests/utils/hash.test.ts` | `createHash` (length, determinism, padding, unicode, edge cases) | Accurate |
| `tests/indexes/in-memory.test.ts` | `InMemoryIndex` (getTerm, addTerm, deleteDocument) | Updated — all `Vector` literals now include `originalWord`; `addTerm`/`deleteDocument` are now `async` and all calls are `await`ed |
| `tests/indexes/json.test.ts` | `JSONIndex` (same API + serialize/deserialize/save/load/dirty-flag) | Updated — same `originalWord` fix; `addTerm`/`deleteDocument` are now `async` and persist inline (`await this.save()`), so calls/tests are `await`ed. Also covers `load()`'s Zod validation: throws on a malformed persisted vector (missing `location`) and when a term's value isn't an array, succeeds on well-formed data |
| `tests/tokenizers/simple.test.ts` | `SimpleTokenizer` (prepare, tokenize, offsets, stop words, TermVector shape, `originalWord` propagation) | Updated — offsets assertions include `originalWord`; added a dedicated test for `originalWord` carrying the pre-stemmed word |
| `tests/views/documents.test.ts` | `makeDocumentViews` (status codes, response shapes, engine delegation, mock engine) | Updated — added coverage for `updateDocument`'s `DocumentSchema` validation: 400 on a body missing required fields, 400 on a field with the wrong type, 400 on invalid JSON, and `engine.addDocument` never called in any of those cases; also confirms an optional `contentType` is accepted |
| `tests/views/search.test.ts` | `makeSearchViews` (validation, results, query echo, engine delegation) | Updated — mock `search` is properly async, and the two "happy path" tests were rewritten now that `views/search.ts` awaits `engine.search()`: they assert the real resolved `Result[]` (by id) rather than the old buggy `{}` shape |
| `tests/views/stats.test.ts` | `makeStatsViews` (status, version in body, content-type header) | Accurate. `makeMockEngine`'s `indexSize`/`documentStoreSize` no-op defaults (resolving `0`) keep these tests passing now that `generalStats` calls both |
| `tests/results.test.ts` | `Result` defaults; `Results` (`addTermResults` merging/creating entries, throwing on unknown doc id, `scoreResults` delegating to `IScorer` and sorting descending, `slice()`, iteration) | New |
| `tests/postprocessor.test.ts` | `Postprocessor` registry (fluent `register`, identity pass-through with no plugins, ordered pipeline execution, non-mutation of the original result via clone-then-process) | New |
| `tests/scorers/simple.test.ts` | `SimpleScorer` (matched-word-length / docLength scoring, multi-word sum, zero-location and zero-docLength edge cases, unclamped score > 1, mutation of the passed-in result) | New |
| `tests/documents/in-memory.test.ts` | `InMemoryDocumentStore` (length, addDocument/getDocument round-trip and overwrite, missing-id throw, getDocumentLength, deleteDocument, clear) | New |
| `tests/documents/json.test.ts` | `JSONDocumentStore` (length/addDocument/getDocument, getDocumentLength, deleteDocument, serialize/deserialize, makeFilePath, `DATA_ROOT` default) plus a dedicated `save/load persistence` section asserting `addDocument`/`deleteDocument`/`clear()` all persist to disk immediately (dirty-flag bug fixed — `#isDirty` is now set on every mutation) and that data survives across fresh `JSONDocumentStore` instances pointed at the same `storagePath`. Also covers `load()`'s Zod validation: throws on a malformed persisted document (missing `content`) and on a non-object payload, succeeds on well-formed data | Updated — dirty-flag section rewritten from documenting the bug to asserting the fix, plus new coverage for `load()` validation |
| `tests/schemas.test.ts` | `DocumentSchema`, `VectorSchema`, `SerializedDocumentsSchema`, `SerializedIndexSchema` (accept well-formed input, reject missing/mistyped fields, reject non-object/non-array payloads) | New |

`src/tokenizers/snowball.ts` and `src/postprocessors/highlights.ts` are empty stubs with nothing to test. `src/server.ts` and `src/cli.ts` also remain untested (server/CLI would need integration-style tests against a real `Bun.serve()` instance; not attempted here).

### Task Runner

Uses `just` (see `justfile`):

```sh
just setup       # bun install
just test        # bun test
just lint        # bunx tsc --noEmit -p tsconfig.json
just format      # prettier write
just format-check
just build-docs      # mdbook build (docs/)
just publish-docs    # ./scripts/publish-docs.sh
just publish-release # ./scripts/publish-release.sh
```

`just lint` and `bun test`'s type-checking surface are now the same project config (`tsconfig.json`) — there's exactly one `tsc` configuration for the whole repo, and it's fully clean.

### Import conventions

- Use explicit `.ts` extensions on local imports (e.g. `import { stripTags } from '../utils/html.ts'`). Required for Bun compatibility and editor resolution with `moduleResolution: bundler` + `allowImportingTsExtensions: true`. (In practice several `src/` files still import without the extension, e.g. `src/engine.ts`'s imports of `./constants`, `./interfaces`, etc. — extensionless imports still resolve under Bun/bundler mode but are inconsistent with this stated convention.)

### Scripts (`scripts/`)

- **`scripts/playground.ts`** — manual, ad-hoc exercising of the engine (JSON-backed by default, in-memory commented out); not a test, run directly with `bun scripts/playground.ts`.
- **`scripts/benchmarks/`** — `bench-utils.ts` (timing/formatting helpers), `shakespeare-inmem.ts` / `shakespeare-json.ts` (indexing + query timing against a local corpus path hardcoded to `/Users/daniel/Desktop/shakespeares-works` — not portable, expects that path to exist locally). Both import from the `anthology` package name itself (via `index.ts`'s export map), not relative `src/` paths — a good smoke test that the public API surface is self-consistent.
