import { describe, test, expect, beforeEach } from "bun:test";
import { Result, Results } from "../src/results.ts";
import { InMemoryDocumentStore } from "../src/documents/in-memory.ts";
import { SimpleScorer } from "../src/scorers/simple.ts";
import type { IScorer, IResult } from "../src/interfaces.ts";
import type { Vector } from "../src/types.ts";

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

describe("Result", () => {
  test("initializes with sane defaults", () => {
    const result = new Result("42");
    expect(result.id).toBe("42");
    expect(result.locations).toEqual([]);
    expect(result.score).toBe(0);
    expect(result.docLength).toBe(0);
    expect(result.document).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function makeVector(id: string, originalWord: string, location: number): Vector {
  return { id, originalWord, location };
}

describe("Results", () => {
  let store: InMemoryDocumentStore;
  let results: Results;

  beforeEach(async () => {
    store = new InMemoryDocumentStore();
    await store.addDocument({ id: "1", content: "hello world" }); // length 11
    await store.addDocument({ id: "2", content: "hello there friend" }); // length 18
    results = new Results(store);
  });

  test("starts empty", () => {
    expect(results.length).toBe(0);
    expect([...results]).toEqual([]);
  });

  describe("addTermResults", () => {
    test("creates a new unscored result for a previously-unseen document", async () => {
      await results.addTermResults([makeVector("1", "hello", 0)]);
      expect(results.unscored.size).toBe(1);
      const result = results.unscored.get("1")!;
      expect(result.id).toBe("1");
      expect(result.docLength).toBe(11);
      expect(result.locations).toEqual([{ originalWord: "hello", location: 0 }]);
    });

    test("merges additional locations into an already-seen document", async () => {
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.addTermResults([makeVector("1", "world", 6)]);
      expect(results.unscored.size).toBe(1);
      const result = results.unscored.get("1")!;
      expect(result.locations).toEqual([
        { originalWord: "hello", location: 0 },
        { originalWord: "world", location: 6 },
      ]);
    });

    test("tracks multiple documents independently", async () => {
      await results.addTermResults([makeVector("1", "hello", 0), makeVector("2", "hello", 0)]);
      expect(results.unscored.size).toBe(2);
      expect(results.unscored.get("1")!.docLength).toBe(11);
      expect(results.unscored.get("2")!.docLength).toBe(18);
    });

    test("throws if the vector references a document not in the store", async () => {
      expect(results.addTermResults([makeVector("missing", "hello", 0)])).rejects.toThrow();
    });
  });

  describe("scoreResults", () => {
    test("moves every unscored result into `results`, scored", async () => {
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.addTermResults([makeVector("2", "hello", 0)]);
      await results.scoreResults(new SimpleScorer());

      expect(results.length).toBe(2);
      for (const result of results) {
        expect(result.score).toBeGreaterThan(0);
      }
    });

    test("sorts results in descending order of score", async () => {
      // doc 1 (len 11): "hello" (5 chars) -> score 5/11
      // doc 2 (len 18): "hello" + "there" + "friend" (5+5+6=16 chars) -> score 16/18
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.addTermResults([
        makeVector("2", "hello", 0),
        makeVector("2", "there", 6),
        makeVector("2", "friend", 12),
      ]);
      await results.scoreResults(new SimpleScorer());

      const scored = [...results];
      expect(scored[0]!.id).toBe("2");
      expect(scored[1]!.id).toBe("1");
      expect(scored[0]!.score).toBeGreaterThan(scored[1]!.score);
    });

    test("delegates scoring to the provided IScorer", async () => {
      let called = 0;
      const scorer: IScorer = {
        async score(result: IResult): Promise<IResult> {
          called += 1;
          result.score = 99;
          return result;
        },
      };
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.scoreResults(scorer);
      expect(called).toBe(1);
      expect([...results][0]!.score).toBe(99);
    });
  });

  describe("slice", () => {
    test("returns a new Results with a sliced copy of `results`", async () => {
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.addTermResults([makeVector("2", "hello", 0)]);
      await results.scoreResults(new SimpleScorer());

      const sliced = results.slice(0, 1);
      expect(sliced).toBeInstanceOf(Results);
      expect(sliced.length).toBe(1);
      expect(sliced.documentStore).toBe(results.documentStore);
      // original is untouched
      expect(results.length).toBe(2);
    });

    test("slice() with no args returns a full copy", async () => {
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.scoreResults(new SimpleScorer());
      const sliced = results.slice();
      expect(sliced.length).toBe(results.length);
    });
  });

  describe("iteration", () => {
    test("is iterable via for...of", async () => {
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.addTermResults([makeVector("2", "hello", 0)]);
      await results.scoreResults(new SimpleScorer());

      const collected: string[] = [];
      for (const result of results) {
        collected.push(result.id);
      }
      expect(collected.sort()).toEqual(["1", "2"]);
    });

    test("supports spreading into an array", async () => {
      await results.addTermResults([makeVector("1", "hello", 0)]);
      await results.scoreResults(new SimpleScorer());
      expect([...results]).toHaveLength(1);
    });
  });
});
