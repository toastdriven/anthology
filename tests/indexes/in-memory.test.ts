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
    test("returns empty array for unknown term", () => {
      expect(index.getTerm("missing")).toEqual([]);
    });

    test("returns vectors for a known term", () => {
      const tv: TermVector = { term: "hello", vector: { id: "1", location: 0 } };
      index.addTerm(tv);
      expect(index.getTerm("hello")).toEqual([{ id: "1", location: 0 }]);
    });

    test("returns a copy, not the internal array", () => {
      const tv: TermVector = { term: "hello", vector: { id: "1", location: 0 } };
      index.addTerm(tv);
      const result = index.getTerm("hello");
      result.push({ id: "mutant", location: 99 });
      // Internal state should be unchanged
      expect(index.getTerm("hello")).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // addTerm
  // ---------------------------------------------------------------------------

  describe("addTerm", () => {
    test("adds a term+vector", () => {
      index.addTerm({ term: "cat", vector: { id: "1", location: 2 } });
      expect(index.getTerm("cat")).toEqual([{ id: "1", location: 2 }]);
    });

    test("accumulates multiple vectors for the same term", () => {
      index.addTerm({ term: "cat", vector: { id: "1", location: 2 } });
      index.addTerm({ term: "cat", vector: { id: "2", location: 5 } });
      expect(index.getTerm("cat")).toEqual([
        { id: "1", location: 2 },
        { id: "2", location: 5 },
      ]);
    });

    test("does not add exact duplicate (same id + same location)", () => {
      const tv: TermVector = { term: "cat", vector: { id: "1", location: 2 } };
      index.addTerm(tv);
      index.addTerm(tv);
      expect(index.getTerm("cat")).toHaveLength(1);
    });

    test("allows same term + same doc id at different locations", () => {
      index.addTerm({ term: "cat", vector: { id: "1", location: 0 } });
      index.addTerm({ term: "cat", vector: { id: "1", location: 10 } });
      expect(index.getTerm("cat")).toHaveLength(2);
    });

    test("stores different terms independently", () => {
      index.addTerm({ term: "cat", vector: { id: "1", location: 0 } });
      index.addTerm({ term: "dog", vector: { id: "2", location: 0 } });
      expect(index.getTerm("cat")).toEqual([{ id: "1", location: 0 }]);
      expect(index.getTerm("dog")).toEqual([{ id: "2", location: 0 }]);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteDocument
  // ---------------------------------------------------------------------------

  describe("deleteDocument", () => {
    beforeEach(() => {
      index.addTerm({ term: "cat", vector: { id: "1", location: 0 } });
      index.addTerm({ term: "cat", vector: { id: "2", location: 0 } });
      index.addTerm({ term: "dog", vector: { id: "1", location: 4 } });
    });

    test("removes all vectors for the given docId across all terms", () => {
      index.deleteDocument("1");
      expect(index.getTerm("cat")).toEqual([{ id: "2", location: 0 }]);
      expect(index.getTerm("dog")).toEqual([]);
    });

    test("leaves other documents untouched", () => {
      index.deleteDocument("1");
      expect(index.getTerm("cat")).toEqual([{ id: "2", location: 0 }]);
    });

    test("is a no-op for an unknown docId", () => {
      index.deleteDocument("999");
      expect(index.getTerm("cat")).toHaveLength(2);
      expect(index.getTerm("dog")).toHaveLength(1);
    });

    test("can delete a document that was the only entry for a term", () => {
      index.deleteDocument("2");
      // "2" was only in "cat" — other vectors remain
      expect(index.getTerm("cat")).toEqual([{ id: "1", location: 0 }]);
    });
  });
});
