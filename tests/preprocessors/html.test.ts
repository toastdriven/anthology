import { describe, test, expect } from "bun:test";
import { HTMLPreprocessor } from "../../src/preprocessors/html";
import type { Document } from "../../src/types";

const preprocessor = new HTMLPreprocessor();

describe("HTMLPreprocessor", () => {
  // ---------------------------------------------------------------------------
  // contentTypes declaration
  // ---------------------------------------------------------------------------

  describe("contentTypes", () => {
    test('declares "text/html"', () => {
      expect(preprocessor.contentTypes).toContain("text/html");
    });

    test("contentTypes is non-empty", () => {
      expect(preprocessor.contentTypes.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // process — output shape
  // ---------------------------------------------------------------------------

  describe("process — output shape", () => {
    test("returns a Document", async () => {
      const doc: Document = { id: "1", content: "<p>hello</p>", contentType: "text/html" };
      const result = await preprocessor.process(doc);
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("contentType");
    });

    test("preserves the document id", async () => {
      const doc: Document = { id: "doc-99", content: "<p>hi</p>", contentType: "text/html" };
      const result = await preprocessor.process(doc);
      expect(result.id).toBe("doc-99");
    });

    test('sets contentType to "text/plain" on output', async () => {
      const doc: Document = { id: "1", content: "<p>hi</p>", contentType: "text/html" };
      const result = await preprocessor.process(doc);
      expect(result.contentType).toBe("text/plain");
    });
  });

  // ---------------------------------------------------------------------------
  // process — content transformation
  // ---------------------------------------------------------------------------

  describe("process — content", () => {
    test("strips HTML tags from content", async () => {
      const doc: Document = { id: "1", content: "<h1>Hello world</h1>", contentType: "text/html" };
      const result = await preprocessor.process(doc);
      expect(result.content).toBe("Hello world");
    });

    test("strips nested tags", async () => {
      const doc: Document = {
        id: "1",
        content: "<p>Hello <b>bold</b> world</p>",
        contentType: "text/html",
      };
      const result = await preprocessor.process(doc);
      expect(result.content).toBe("Hello bold world");
    });

    test("strips tags with attributes", async () => {
      const doc: Document = {
        id: "1",
        content: '<a href="https://example.com">click here</a>',
        contentType: "text/html",
      };
      const result = await preprocessor.process(doc);
      expect(result.content).toBe("click here");
    });

    test("collapses whitespace", async () => {
      const doc: Document = {
        id: "1",
        content: "<p>hello</p>   <p>world</p>",
        contentType: "text/html",
      };
      const result = await preprocessor.process(doc);
      expect(result.content).toBe("hello world");
    });

    test("handles empty content", async () => {
      const doc: Document = { id: "1", content: "", contentType: "text/html" };
      const result = await preprocessor.process(doc);
      expect(result.content).toBe("");
    });

    test("handles content with no tags", async () => {
      const doc: Document = { id: "1", content: "plain text", contentType: "text/html" };
      const result = await preprocessor.process(doc);
      expect(result.content).toBe("plain text");
    });

    test("does not mutate the original document", async () => {
      const doc: Document = { id: "1", content: "<p>hello</p>", contentType: "text/html" };
      await preprocessor.process(doc);
      expect(doc.content).toBe("<p>hello</p>");
      expect(doc.contentType).toBe("text/html");
    });
  });
});
