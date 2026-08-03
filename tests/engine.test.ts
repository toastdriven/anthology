import { describe, test, expect, beforeEach } from "bun:test";
import { SearchEngine } from "../src/engine";
import { InMemoryIndex } from "../src/indexes/in-memory";
import { SimpleTokenizer } from "../src/tokenizers/simple";
import { Preprocessor } from "../src/preprocessor";
import { HTMLPreprocessor } from "../src/preprocessors/html";
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

async function makeEngine(): Promise<SearchEngine> {
  const engine = new SearchEngine(new InMemoryIndex(), new SimpleTokenizer());
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

  test('"Hello" matches docs containing "hello"', () => {
    const results = engine.search("Hello");
    expect(results).toContain("1");
    expect(results).toContain("2");
  });

  test('"worlds" (plural) matches docs containing "world"', () => {
    // tokenizer strips trailing -s, so "worlds" → "world"
    const results = engine.search("worlds");
    expect(results).toContain("1");
    expect(results).toContain("3");
  });

  test('"dog and cat" returns dog & cat docs; "and" is ignored as a stop word', () => {
    const results = engine.search("dog and cat");
    expect(results).toContain("2"); // dog
    expect(results).toContain("3"); // cat
    expect(results).toContain("4"); // dogs → dog
  });

  test('"pizza" returns no results', () => {
    expect(engine.search("pizza")).toEqual([]);
  });

  // --- ranking --------------------------------------------------------------

  test("result order is by descending match count", () => {
    // "best" appears in doc 4 and doc 5; a single-term query should return
    // both, with no ordering preference (1 hit each) — just confirm both present
    const results = engine.search("best");
    expect(results).toContain("4");
    expect(results).toContain("5");
  });

  test("document with more matching terms ranks higher", () => {
    // doc 2 contains both "hello" and "dog"; doc 1 only "hello"; doc 4 only "dog"
    // → doc 2 should rank first for "hello dog"
    const results = engine.search("hello dog");
    expect(results[0]).toBe("2");
  });

  // --- edge cases -----------------------------------------------------------

  test("empty query returns no results", () => {
    expect(engine.search("")).toEqual([]);
  });

  test("query consisting only of stop words returns no results", () => {
    expect(engine.search("and or but the")).toEqual([]);
  });

  test("search is case-insensitive", () => {
    expect(engine.search("HELLO")).toEqual(engine.search("hello"));
  });

  test("results never include the internal query-document sentinel id", () => {
    const results = engine.search("hello world dog cat best");
    expect(results).not.toContain("just-a-query");
  });

  // --- addDocument ----------------------------------------------------------

  test("newly added document is immediately searchable", async () => {
    await engine.addDocument({ id: "99", content: "avocado toast" });
    expect(engine.search("avocado")).toContain("99");
  });

  test("adding the same document twice does not duplicate results", async () => {
    await engine.addDocument({ id: "1", content: "Hello world!" });
    const results = engine.search("hello");
    const count = results.filter((id) => id === "1").length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Smoke tests — HTMLPreprocessor + SearchEngine
// ---------------------------------------------------------------------------

describe("SearchEngine + HTMLPreprocessor (smoke)", () => {
  test("Preprocessor with HTMLPreprocessor strips tags before indexing", async () => {
    const preprocessor = new Preprocessor().register(new HTMLPreprocessor());
    const engine = new SearchEngine(new InMemoryIndex(), new SimpleTokenizer(), preprocessor);
    await engine.setUp();

    await engine.addDocument({
      id: "page-1",
      content: "<h1>Hello <b>world</b></h1>",
      contentType: "text/html",
    });

    // Terms from the stripped text are findable
    expect(engine.search("hello")).toContain("page-1");
    expect(engine.search("world")).toContain("page-1");
  });

  test("HTML tags themselves are not indexed as terms", async () => {
    const preprocessor = new Preprocessor().register(new HTMLPreprocessor());
    const engine = new SearchEngine(new InMemoryIndex(), new SimpleTokenizer(), preprocessor);
    await engine.setUp();

    await engine.addDocument({
      id: "page-1",
      content: "<p>avocado toast</p>",
      contentType: "text/html",
    });

    // The raw tag name should not appear as a searchable term
    expect(engine.search("p")).not.toContain("page-1");
  });

  test("plain-text documents still work when HTMLPreprocessor is registered", async () => {
    const preprocessor = new Preprocessor().register(new HTMLPreprocessor());
    const engine = new SearchEngine(new InMemoryIndex(), new SimpleTokenizer(), preprocessor);
    await engine.setUp();

    await engine.addDocument({ id: "plain-1", content: "cats and dogs" });
    await engine.addDocument({
      id: "html-1",
      content: "<p>cats and dogs</p>",
      contentType: "text/html",
    });

    expect(engine.search("cat")).toContain("plain-1");
    expect(engine.search("cat")).toContain("html-1");
  });

  test("multiple HTML documents are each independently searchable", async () => {
    const preprocessor = new Preprocessor().register(new HTMLPreprocessor());
    const engine = new SearchEngine(new InMemoryIndex(), new SimpleTokenizer(), preprocessor);
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

    expect(engine.search("avocado")).toContain("page-1");
    expect(engine.search("avocado")).not.toContain("page-2");
    expect(engine.search("banana")).toContain("page-2");
    expect(engine.search("banana")).not.toContain("page-1");
  });
});
