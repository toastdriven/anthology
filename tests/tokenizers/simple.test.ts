import { describe, test, expect } from "bun:test";
import { SimpleTokenizer } from "../../src/tokenizers/simple";
import type { Document } from "../../src/types";

const tok = new SimpleTokenizer();

// Helper to call tokenize with minimal boilerplate
function tokenize(content: string) {
  const doc: Document = { id: "test", content };
  return tok.tokenize(doc);
}

// Helper: extract just the terms from a tokenize result
function terms(content: string): string[] {
  return tokenize(content).map((tv) => tv.term);
}

describe("SimpleTokenizer", () => {
  // ---------------------------------------------------------------------------
  // prepare
  // ---------------------------------------------------------------------------

  describe("prepare", () => {
    test("lowercases input", () => {
      expect(tok.prepare("Hello")).toBe("hello");
      expect(tok.prepare("WORLD")).toBe("world");
    });

    test("trims surrounding whitespace", () => {
      expect(tok.prepare("  hello  ")).toBe("hello");
    });

    test("strips punctuation characters", () => {
      expect(tok.prepare("hello!")).toBe("hello");
      expect(tok.prepare('"quoted"')).toBe("quot");
      expect(tok.prepare("end.")).toBe("end");
      expect(tok.prepare("(parens)")).toBe("paren"); // -s suffix is stripped after punctuation removal
    });

    test("strips trailing -es suffix", () => {
      expect(tok.prepare("foxes")).toBe("fox");
    });

    test("strips trailing -ing suffix", () => {
      expect(tok.prepare("running")).toBe("runn"); // naive strip, not true stemmer
    });

    test("strips trailing -s suffix", () => {
      expect(tok.prepare("cats")).toBe("cat");
    });

    test("does not strip suffix mid-word", () => {
      expect(tok.prepare("testing")).toBe("test"); // -ing stripped at end
    });

    test("returns empty string for whitespace-only input", () => {
      expect(tok.prepare("   ")).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize — term values
  // ---------------------------------------------------------------------------

  describe("tokenize — terms", () => {
    test("produces one TermVector per non-stop-word token", () => {
      expect(terms("Hello world")).toEqual(["hello", "world"]);
    });

    test("filters stop words", () => {
      // STOP_WORDS: and, or, i, but, the, to
      expect(terms("and or i but the to")).toEqual([]);
    });

    test("stop-word filtering is case-insensitive", () => {
      expect(terms("The AND Or")).toEqual([]);
    });

    test("strips punctuation before stop-word check", () => {
      // "the." → stripped to "the" → filtered
      expect(terms("the.")).toEqual([]);
    });

    test("returns empty array for empty string", () => {
      expect(terms("")).toEqual([]);
    });

    test("returns empty array for whitespace-only string", () => {
      expect(terms("   ")).toEqual([]);
    });

    test("normalises suffix across multiple tokens", () => {
      expect(terms("cats dogs")).toEqual(["cat", "dog"]);
    });

    test("handles mixed punctuation inside content", () => {
      expect(terms("Hello, world!")).toEqual(["hello", "world"]);
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize — vector positions (offsets)
  // ---------------------------------------------------------------------------

  describe("tokenize — offsets", () => {
    test("records the character offset of each token", () => {
      const result = tokenize("hello world");
      expect(result[0].vector).toEqual({ id: "test", location: 0 });
      expect(result[1].vector).toEqual({ id: "test", location: 6 });
    });

    test("offset reflects position in original string, not cleaned word", () => {
      // "cats" starts at index 0; after prepare → "cat", but location stays 0
      const result = tokenize("cats");
      expect(result[0].vector.location).toBe(0);
    });

    test("assigns correct offsets when stop words are skipped", () => {
      // "the" is a stop word at 0; "cat" starts at 4
      const result = tokenize("the cat");
      expect(result).toHaveLength(1);
      expect(result[0].vector.location).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize — document id propagation
  // ---------------------------------------------------------------------------

  describe("tokenize — document id", () => {
    test("all vectors carry the document id", () => {
      const doc: Document = { id: "doc-42", content: "hello world" };
      const result = tok.tokenize(doc);
      result.forEach((tv) => {
        expect(tv.vector.id).toBe("doc-42");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize — shape of returned TermVectors
  // ---------------------------------------------------------------------------

  describe("tokenize — TermVector shape", () => {
    test("each result has term and vector fields", () => {
      const result = tokenize("hello");
      expect(result[0]).toHaveProperty("term");
      expect(result[0]).toHaveProperty("vector");
      expect(result[0].vector).toHaveProperty("id");
      expect(result[0].vector).toHaveProperty("location");
    });
  });
});
