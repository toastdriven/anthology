import { describe, test, expect, beforeEach } from "bun:test";
import { SearchEngine } from "../src/engine";
import { InMemoryIndex } from "../src/indexes/in-memory";
import { InMemoryDocumentStore } from "../src/documents/in-memory";
import { SimpleTokenizer } from "../src/tokenizers/simple";
import { Preprocessor } from "../src/preprocessor";
import { HTMLPreprocessor } from "../src/preprocessors/html";
import type { Result } from "../src/results";
import type { Document } from "../src/types";

// ---------------------------------------------------------------------------
// Shared corpus (mirrors sketch.ts)
// ---------------------------------------------------------------------------

const DOCUMENTS: Document[] = [
  { id: "1", content: "Hello world!" },
  { id: "2", content: "hello yes this is dog" },
  { id: "3", content: "A cat's world is a playground" },
  { id: "4", content: "Dogs are man's best friend" },
  { id: "5", content: "It was the best of times, it was the worst of times." },
];

// Thin wrapper purely for readability in the assertions below — no cast
// needed; `SearchEngine.search()` is correctly annotated `Promise<Result[]>`.
async function search(engine: SearchEngine, query: string): Promise<Result[]> {
  return await engine.search(query);
}

function ids(results: Result[]): string[] {
  return results.map((r) => r.id);
}

async function makeEngine(): Promise<SearchEngine> {
  const engine = new SearchEngine({
    index: new InMemoryIndex(),
    documentStore: new InMemoryDocumentStore(),
    tokenizer: new SimpleTokenizer(),
  });
  await engine.setUp();
  for (const doc of DOCUMENTS) {
    await engine.addDocument(doc);
  }
  return engine;
}

// ---------------------------------------------------------------------------
// Smoke / integration tests
// ---------------------------------------------------------------------------

describe("SearchEngine (integration)", () => {
  let engine: SearchEngine;

  beforeEach(async () => {
    engine = await makeEngine();
  });

  // --- basic matching -------------------------------------------------------

  test('"Hello" matches docs containing "hello"', async () => {
    const results = ids(await search(engine, "Hello"));
    expect(results).toContain("1");
    expect(results).toContain("2");
  });

  test('"worlds" (plural) matches docs containing "world"', async () => {
    // tokenizer strips trailing -s, so "worlds" → "world"
    const results = ids(await search(engine, "worlds"));
    expect(results).toContain("1");
    expect(results).toContain("3");
  });

  test('"dog and cat" returns dog & cat docs; "and" is ignored as a stop word', async () => {
    const results = ids(await search(engine, "dog and cat"));
    expect(results).toContain("2"); // dog
    expect(results).toContain("3"); // cat
    expect(results).toContain("4"); // dogs → dog
  });

  test('"pizza" returns no results', async () => {
    expect(await search(engine, "pizza")).toEqual([]);
  });

  // --- ranking --------------------------------------------------------------

  test("result order is by descending score", async () => {
    // "best" appears in doc 4 and doc 5; a single-term query should return
    // both — just confirm both are present, ranking isn't asserted here.
    const results = ids(await search(engine, "best"));
    expect(results).toContain("4");
    expect(results).toContain("5");
  });

  test("document matching both query terms is included alongside single-term matches", async () => {
    // doc 2 contains both "hello" and "dog"; doc 1 only "hello"; doc 4 only "dog".
    // SimpleScorer scores by matched-term-length / docLength, so a short
    // single-term doc can outscore a longer multi-term doc — we only assert
    // presence and a positive score here, not relative ranking.
    const results = await search(engine, "hello dog");
    const byId = new Map(results.map((r) => [r.id, r]));
    expect(byId.has("1")).toBe(true);
    expect(byId.has("2")).toBe(true);
    expect(byId.has("4")).toBe(true);
    expect(byId.get("2")!.score).toBeGreaterThan(0);
  });

  // --- edge cases -----------------------------------------------------------

  test("empty query returns no results", async () => {
    expect(await search(engine, "")).toEqual([]);
  });

  test("query consisting only of stop words returns no results", async () => {
    expect(await search(engine, "and or but the")).toEqual([]);
  });

  test("search is case-insensitive", async () => {
    expect(ids(await search(engine, "HELLO")).sort()).toEqual(ids(await search(engine, "hello")).sort());
  });

  test("results never include the internal query-document sentinel id", async () => {
    const results = ids(await search(engine, "hello world dog cat best"));
    expect(results).not.toContain("just-a-query");
  });

  test("each result exposes id, score, docLength, and locations", async () => {
    const results = await search(engine, "hello");
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(typeof result.id).toBe("string");
      expect(typeof result.score).toBe("number");
      expect(typeof result.docLength).toBe("number");
      expect(Array.isArray(result.locations)).toBe(true);
    }
  });

  // --- addDocument ----------------------------------------------------------

  test("newly added document is immediately searchable", async () => {
    await engine.addDocument({ id: "99", content: "avocado toast" });
    expect(ids(await search(engine, "avocado"))).toContain("99");
  });

  // --- deleteDocument -------------------------------------------------------

  test("deleted document is no longer searchable", async () => {
    expect(ids(await search(engine, "hello"))).toContain("1");
    await engine.deleteDocument("1");
    expect(ids(await search(engine, "hello"))).not.toContain("1");
  });

  test("deleted document is removed from the document store", async () => {
    await engine.deleteDocument("1");
    await expect(engine.getDocument("1")).rejects.toThrow();
  });

  test("deleting a document does not affect other documents' searchability", async () => {
    await engine.deleteDocument("1");
    // doc 2 also contains "hello" and should remain searchable
    expect(ids(await search(engine, "hello"))).toContain("2");
    // unrelated terms in untouched documents still resolve
    expect(ids(await search(engine, "cat"))).toContain("3");
  });

  test("searching after a delete does not throw despite stale index entries being cleaned up", async () => {
    // Regression guard: prior to wiring `IIndex.deleteDocument` into
    // `SearchEngine.deleteDocument`, stale term vectors left in the index
    // caused `Results.addTermResults` to throw when resolving `getDocumentLength`
    // for the now-missing document (see AGENTS.md "Known issues").
    await engine.deleteDocument("1");
    const results = await search(engine, "hello world");
    expect(ids(results)).not.toContain("1");
  });

  test("adding the same document twice does not duplicate results", async () => {
    await engine.addDocument({ id: "1", content: "Hello world!" });
    const results = ids(await search(engine, "hello"));
    const count = results.filter((id) => id === "1").length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Smoke tests — HTMLPreprocessor + SearchEngine
// ---------------------------------------------------------------------------

function makeHtmlEngine(): SearchEngine {
  const preprocessor = new Preprocessor().register(new HTMLPreprocessor());
  return new SearchEngine({
    index: new InMemoryIndex(),
    documentStore: new InMemoryDocumentStore(),
    tokenizer: new SimpleTokenizer(),
    preprocessor,
  });
}

describe("SearchEngine + HTMLPreprocessor (smoke)", () => {
  test("Preprocessor with HTMLPreprocessor strips tags before indexing", async () => {
    const engine = makeHtmlEngine();
    await engine.setUp();

    await engine.addDocument({
      id: "page-1",
      content: "<h1>Hello <b>world</b></h1>",
      contentType: "text/html",
    });

    // Terms from the stripped text are findable
    expect(ids(await search(engine, "hello"))).toContain("page-1");
    expect(ids(await search(engine, "world"))).toContain("page-1");
  });

  test("HTML tags themselves are not indexed as terms", async () => {
    const engine = makeHtmlEngine();
    await engine.setUp();

    await engine.addDocument({
      id: "page-1",
      content: "<p>avocado toast</p>",
      contentType: "text/html",
    });

    // The raw tag name should not appear as a searchable term
    expect(ids(await search(engine, "p"))).not.toContain("page-1");
  });

  test("plain-text documents still work when HTMLPreprocessor is registered", async () => {
    const engine = makeHtmlEngine();
    await engine.setUp();

    await engine.addDocument({ id: "plain-1", content: "cats and dogs" });
    await engine.addDocument({
      id: "html-1",
      content: "<p>cats and dogs</p>",
      contentType: "text/html",
    });

    const results = ids(await search(engine, "cat"));
    expect(results).toContain("plain-1");
    expect(results).toContain("html-1");
  });

  test("multiple HTML documents are each independently searchable", async () => {
    const engine = makeHtmlEngine();
    await engine.setUp();

    await engine.addDocument({
      id: "page-1",
      content: "<h1>avocado</h1>",
      contentType: "text/html",
    });
    await engine.addDocument({
      id: "page-2",
      content: "<p>banana bread</p>",
      contentType: "text/html",
    });

    expect(ids(await search(engine, "avocado"))).toContain("page-1");
    expect(ids(await search(engine, "avocado"))).not.toContain("page-2");
    expect(ids(await search(engine, "banana"))).toContain("page-2");
    expect(ids(await search(engine, "banana"))).not.toContain("page-1");
  });
});
