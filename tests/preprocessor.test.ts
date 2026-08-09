import { describe, test, expect, mock } from "bun:test";
import { Preprocessor } from "../src/preprocessor";
import type { IPreprocessorPlugin } from "../src/interfaces";
import type { Document } from "../src/types";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

let pluginCounter = 0;

function makePlugin(contentTypes: string[], transform?: (content: string) => string): IPreprocessorPlugin {
  return {
    name: `test-plugin-${++pluginCounter}`,
    contentTypes,
    async process(doc: Document): Promise<Document> {
      return {
        ...doc,
        content: transform ? transform(doc.content) : doc.content,
        contentType: "text/plain",
      };
    },
  };
}

const HTML_DOC: Document = { id: "1", content: "<p>hello</p>", contentType: "text/html" };
const PLAIN_DOC: Document = { id: "2", content: "hello", contentType: "text/plain" };
const UNTYPED_DOC: Document = { id: "3", content: "hello" };

describe("Preprocessor", () => {
  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------

  describe("register", () => {
    test("returns `this` for fluent chaining", () => {
      const p = new Preprocessor();
      const plugin = makePlugin(["text/html"]);
      expect(p.register(plugin)).toBe(p);
    });

    test("supports chaining multiple register calls", () => {
      const p = new Preprocessor();
      const pluginA = makePlugin(["text/html"]);
      const pluginB = makePlugin(["text/markdown"]);
      expect(() => p.register(pluginA).register(pluginB)).not.toThrow();
    });

    test("registers a plugin for each of its declared contentTypes", async () => {
      const p = new Preprocessor();
      const plugin = makePlugin(["text/html", "application/xhtml+xml"], (c) => "transformed");
      p.register(plugin);

      const htmlDoc: Document = { id: "1", content: "x", contentType: "text/html" };
      const xhtmlDoc: Document = { id: "2", content: "x", contentType: "application/xhtml+xml" };

      expect((await p.process(htmlDoc)).content).toBe("transformed");
      expect((await p.process(xhtmlDoc)).content).toBe("transformed");
    });

    test("a later registration for the same contentType replaces the earlier one", async () => {
      const p = new Preprocessor();
      const first = makePlugin(["text/html"], () => "first");
      const second = makePlugin(["text/html"], () => "second");
      p.register(first).register(second);

      const doc: Document = { id: "1", content: "x", contentType: "text/html" };
      expect((await p.process(doc)).content).toBe("second");
    });
  });

  // ---------------------------------------------------------------------------
  // process — pass-through cases
  // ---------------------------------------------------------------------------

  describe("process — pass-through", () => {
    test("returns the document unchanged when no plugins are registered", async () => {
      const p = new Preprocessor();
      const result = await p.process(HTML_DOC);
      expect(result).toEqual(HTML_DOC);
    });

    test("returns the document unchanged when no plugin matches the contentType", async () => {
      const p = new Preprocessor();
      p.register(makePlugin(["text/markdown"]));
      const result = await p.process(HTML_DOC); // text/html — no match
      expect(result).toEqual(HTML_DOC);
    });

    test('document without contentType is treated as "text/plain"', async () => {
      const p = new Preprocessor();
      const plugin = makePlugin(["text/plain"], () => "processed");
      p.register(plugin);
      const result = await p.process(UNTYPED_DOC);
      expect(result.content).toBe("processed");
    });

    test('document with "text/plain" contentType passes through when no plain plugin registered', async () => {
      const p = new Preprocessor();
      p.register(makePlugin(["text/html"]));
      const result = await p.process(PLAIN_DOC);
      expect(result).toEqual(PLAIN_DOC);
    });
  });

  // ---------------------------------------------------------------------------
  // process — plugin dispatch
  // ---------------------------------------------------------------------------

  describe("process — plugin dispatch", () => {
    test("calls the matching plugin's process method", async () => {
      const p = new Preprocessor();
      let called = false;
      const plugin: IPreprocessorPlugin = {
        name: "dispatch-test-plugin",
        contentTypes: ["text/html"],
        async process(doc) {
          called = true;
          return { ...doc, content: "stripped", contentType: "text/plain" };
        },
      };
      p.register(plugin);
      await p.process(HTML_DOC);
      expect(called).toBe(true);
    });

    test("returns the transformed document from the plugin", async () => {
      const p = new Preprocessor();
      p.register(makePlugin(["text/html"], () => "stripped"));
      const result = await p.process(HTML_DOC);
      expect(result.content).toBe("stripped");
    });

    test("does not call a plugin registered for a different contentType", async () => {
      const p = new Preprocessor();
      let called = false;
      const plugin: IPreprocessorPlugin = {
        name: "markdown-test-plugin",
        contentTypes: ["text/markdown"],
        async process(doc) {
          called = true;
          return doc;
        },
      };
      p.register(plugin);
      await p.process(HTML_DOC);
      expect(called).toBe(false);
    });

    test("multiple plugins coexist and each handles its own contentType", async () => {
      const p = new Preprocessor();
      p.register(makePlugin(["text/html"], () => "from-html"));
      p.register(makePlugin(["text/markdown"], () => "from-markdown"));

      const htmlDoc: Document = { id: "1", content: "x", contentType: "text/html" };
      const mdDoc: Document = { id: "2", content: "x", contentType: "text/markdown" };

      expect((await p.process(htmlDoc)).content).toBe("from-html");
      expect((await p.process(mdDoc)).content).toBe("from-markdown");
    });
  });
});
