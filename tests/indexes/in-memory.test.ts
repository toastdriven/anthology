import { describe, test, expect, beforeEach } from "bun:test";
import { InMemoryIndex } from "../../src/indexes/in-memory";
import type { TermVector } from "../../src/types";

describe("InMemoryIndex", () => {
  let index: InMemoryIndex;

  beforeEach(() => {
    index = new InMemoryIndex();
  });

  // ---------------------------------------------------------------------------
  // getTerm
  // ---------------------------------------------------------------------------

  describe("getTerm", () => {
    test("returns empty array for unknown term", async () => {
      expect(await index.getTerm("missing")).toEqual([]);
    });

    test("returns vectors for a known term", async () => {
      const tv: TermVector = { term: "hello", vector: { id: "1", originalWord: "hello", location: 0 } };
      await index.addTerm(tv);
      expect(await index.getTerm("hello")).toEqual([{ id: "1", originalWord: "hello", location: 0 }]);
    });

    test("returns a copy, not the internal array", async () => {
      const tv: TermVector = { term: "hello", vector: { id: "1", originalWord: "hello", location: 0 } };
      await index.addTerm(tv);
      const result = await index.getTerm("hello");
      result.push({ id: "mutant", originalWord: "mutant", location: 99 });
      // Internal state should be unchanged
      expect(await index.getTerm("hello")).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // addTerm
  // ---------------------------------------------------------------------------

  describe("addTerm", () => {
    test("adds a term+vector", async () => {
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "cats", location: 2 } });
      expect(await index.getTerm("cat")).toEqual([{ id: "1", originalWord: "cats", location: 2 }]);
    });

    test("accumulates multiple vectors for the same term", async () => {
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "cat", location: 2 } });
      await index.addTerm({ term: "cat", vector: { id: "2", originalWord: "cats", location: 5 } });
      expect(await index.getTerm("cat")).toEqual([
        { id: "1", originalWord: "cat", location: 2 },
        { id: "2", originalWord: "cats", location: 5 },
      ]);
    });

    test("does not add exact duplicate (same id + same location)", async () => {
      const tv: TermVector = { term: "cat", vector: { id: "1", originalWord: "cat", location: 2 } };
      await index.addTerm(tv);
      await index.addTerm(tv);
      expect(await index.getTerm("cat")).toHaveLength(1);
    });

    test("allows same term + same doc id at different locations", async () => {
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "cat", location: 0 } });
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "cat", location: 10 } });
      expect(await index.getTerm("cat")).toHaveLength(2);
    });

    test("stores different terms independently", async () => {
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "cat", location: 0 } });
      await index.addTerm({ term: "dog", vector: { id: "2", originalWord: "dog", location: 0 } });
      expect(await index.getTerm("cat")).toEqual([{ id: "1", originalWord: "cat", location: 0 }]);
      expect(await index.getTerm("dog")).toEqual([{ id: "2", originalWord: "dog", location: 0 }]);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteDocument
  // ---------------------------------------------------------------------------

  describe("deleteDocument", () => {
    beforeEach(async () => {
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "cat", location: 0 } });
      await index.addTerm({ term: "cat", vector: { id: "2", originalWord: "cat", location: 0 } });
      await index.addTerm({ term: "dog", vector: { id: "1", originalWord: "dog", location: 4 } });
    });

    test("removes all vectors for the given docId across all terms", async () => {
      await index.deleteDocument("1");
      expect(await index.getTerm("cat")).toEqual([{ id: "2", originalWord: "cat", location: 0 }]);
      expect(await index.getTerm("dog")).toEqual([]);
    });

    test("leaves other documents untouched", async () => {
      await index.deleteDocument("1");
      expect(await index.getTerm("cat")).toEqual([{ id: "2", originalWord: "cat", location: 0 }]);
    });

    test("is a no-op for an unknown docId", async () => {
      await index.deleteDocument("999");
      expect(await index.getTerm("cat")).toHaveLength(2);
      expect(await index.getTerm("dog")).toHaveLength(1);
    });

    test("can delete a document that was the only entry for a term", async () => {
      await index.deleteDocument("2");
      // "2" was only in "cat" — other vectors remain
      expect(await index.getTerm("cat")).toEqual([{ id: "1", originalWord: "cat", location: 0 }]);
    });
  });
});
