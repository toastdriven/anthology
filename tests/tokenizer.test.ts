import { describe, test, expect } from "bun:test";
import { Tokenizer } from "../src/tokenizer";
import type { ITokenizerPlugin } from "../src/interfaces";
import type { Document, TermVector } from "../src/types";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

function makePlugin(term: string, location = 0): ITokenizerPlugin {
  return {
    prepare(rawWord: string): string {
      return rawWord;
    },
    async tokenize(document: Document): Promise<TermVector[]> {
      return [
        {
          term,
          vector: { id: document.id, originalWord: term, location },
        },
      ];
    },
  };
}

const DOC: Document = { id: "1", content: "hello world" };

describe("Tokenizer", () => {
  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------

  describe("register", () => {
    test("returns `this` for fluent chaining", () => {
      const t = new Tokenizer();
      const plugin = makePlugin("hello");
      expect(t.register(plugin)).toBe(t);
    });

    test("supports chaining multiple register calls", () => {
      const t = new Tokenizer();
      const pluginA = makePlugin("hello");
      const pluginB = makePlugin("world");
      expect(() => t.register(pluginA).register(pluginB)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // tokenize
  // ---------------------------------------------------------------------------

  describe("tokenize", () => {
    test("returns an empty array when no plugins are registered", async () => {
      const t = new Tokenizer();
      const result = await t.tokenize(DOC);
      expect(result).toEqual([]);
    });

    test("returns the term vectors produced by a single registered plugin", async () => {
      const t = new Tokenizer().register(makePlugin("hello"));
      const result = await t.tokenize(DOC);
      expect(result).toEqual([
        { term: "hello", vector: { id: "1", originalWord: "hello", location: 0 } },
      ]);
    });

    test("concatenates term vectors from multiple plugins in registration order", async () => {
      const t = new Tokenizer()
        .register(makePlugin("hello", 0))
        .register(makePlugin("world", 6));

      const result = await t.tokenize(DOC);
      expect(result.map((tv) => tv.term)).toEqual(["hello", "world"]);
    });

    test("passes the same document to every registered plugin", async () => {
      const seen: Document[] = [];
      const plugin: ITokenizerPlugin = {
        prepare(rawWord) {
          return rawWord;
        },
        async tokenize(document) {
          seen.push(document);
          return [];
        },
      };
      const t = new Tokenizer().register(plugin).register(plugin);
      await t.tokenize(DOC);
      expect(seen).toEqual([DOC, DOC]);
    });
  });
});
