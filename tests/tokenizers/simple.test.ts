import { describe, test, expect } from "bun:test";
import { SimpleTokenizer } from "../../src/tokenizers/simple";
import type { Document } from "../../src/types";

const tok = new SimpleTokenizer();

// Helper to call tokenize with minimal boilerplate
async function tokenize(content: string) {
  const doc: Document = { id: "test", content };
  return tok.tokenize(doc);
}

// Helper: extract just the terms from a tokenize result
async function terms(content: string): Promise<string[]> {
  const result = await tokenize(content);
  return result.map((tv) => tv.term);
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
    test("produces one TermVector per non-stop-word token", async () => {
      expect(await terms("Hello world")).toEqual(["hello", "world"]);
    });

    test("filters stop words", async () => {
      // STOP_WORDS: and, or, i, but, the, to
      expect(await terms("and or i but the to")).toEqual([]);
    });

    test("stop-word filtering is case-insensitive", async () => {
      expect(await terms("The AND Or")).toEqual([]);
    });

    test("strips punctuation before stop-word check", async () => {
      // "the." → stripped to "the" → filtered
      expect(await terms("the.")).toEqual([]);
    });

    test("returns empty array for empty string", async () => {
      expect(await terms("")).toEqual([]);
    });

    test("returns empty array for whitespace-only string", async () => {
      expect(await terms("   ")).toEqual([]);
    });

    test("normalises suffix across multiple tokens", async () => {
      expect(await terms("cats dogs")).toEqual(["cat", "dog"]);
    });

    test("handles mixed punctuation inside content", async () => {
      expect(await terms("Hello, world!")).toEqual(["hello", "world"]);
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize — vector positions (offsets)
  // ---------------------------------------------------------------------------

  describe("tokenize — offsets", () => {
    test("records the character offset of each token", async () => {
      const result = await tokenize("hello world");
      expect(result[0]!.vector).toEqual({ id: "test", originalWord: "hello", location: 0 });
      expect(result[1]!.vector).toEqual({ id: "test", originalWord: "world", location: 6 });
    });

    test("offset reflects position in original string, not cleaned word", async () => {
      // "cats" starts at index 0; after prepare → "cat", but location stays 0
      const result = await tokenize("cats");
      expect(result[0]!.vector.location).toBe(0);
    });

    test("assigns correct offsets when stop words are skipped", async () => {
      // "the" is a stop word at 0; "cat" starts at 4
      const result = await tokenize("the cat");
      expect(result).toHaveLength(1);
      expect(result[0]!.vector.location).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize — document id propagation
  // ---------------------------------------------------------------------------

  describe("tokenize — document id", () => {
    test("all vectors carry the document id", async () => {
      const doc: Document = { id: "doc-42", content: "hello world" };
      const result = await tok.tokenize(doc);
      result.forEach((tv) => {
        expect(tv.vector.id).toBe("doc-42");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize — shape of returned TermVectors
  // ---------------------------------------------------------------------------

  describe("tokenize — TermVector shape", () => {
    test("each result has term and vector fields", async () => {
      const result = await tokenize("hello");
      expect(result[0]!).toHaveProperty("term");
      expect(result[0]!).toHaveProperty("vector");
      expect(result[0]!.vector).toHaveProperty("id");
      expect(result[0]!.vector).toHaveProperty("originalWord");
      expect(result[0]!.vector).toHaveProperty("location");
    });

    test("vector.originalWord carries the pre-stemmed word", async () => {
      const result = await tokenize("cats");
      expect(result[0]!.term).toBe("cat");
      expect(result[0]!.vector.originalWord).toBe("cats");
    });
  });
});
