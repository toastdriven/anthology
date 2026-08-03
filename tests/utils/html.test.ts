import { describe, test, expect } from "bun:test";
import { stripTags } from "../../src/utils/html";

describe("stripTags", () => {
  // ---------------------------------------------------------------------------
  // No-op cases
  // ---------------------------------------------------------------------------

  test("returns empty string unchanged", () => {
    expect(stripTags("")).toBe("");
  });

  test("returns plain text with no tags unchanged", () => {
    expect(stripTags("hello world")).toBe("hello world");
  });

  // ---------------------------------------------------------------------------
  // Basic tag stripping
  // ---------------------------------------------------------------------------

  test("strips a single wrapping tag pair", () => {
    expect(stripTags("<b>hello</b>")).toBe("hello");
  });

  test("strips tags and preserves inner text", () => {
    expect(stripTags("<h1>Hello world</h1>")).toBe("Hello world");
  });

  test("strips self-closing tags", () => {
    expect(stripTags("line one<br />line two")).toBe("line one line two");
  });

  test("strips tags with attributes", () => {
    expect(stripTags('<a href="https://example.com">click here</a>')).toBe("click here");
  });

  test("strips tags with multiple attributes", () => {
    expect(stripTags('<img src="x.png" alt="an image" />')).toBe("");
  });

  // ---------------------------------------------------------------------------
  // Multiple / nested tags
  // ---------------------------------------------------------------------------

  test("strips multiple sibling tags", () => {
    expect(stripTags("<h1>Title</h1><p>Body</p>")).toBe("Title Body");
  });

  test("strips nested tags", () => {
    expect(stripTags("<p>Hello <b>bold</b> world</p>")).toBe("Hello bold world");
  });

  test("strips deeply nested tags", () => {
    expect(stripTags("<div><section><p>deep</p></section></div>")).toBe("deep");
  });

  // ---------------------------------------------------------------------------
  // Whitespace handling
  // ---------------------------------------------------------------------------

  test("collapses multiple whitespace runs into a single space", () => {
    expect(stripTags("<p>hello</p>   <p>world</p>")).toBe("hello world");
  });

  test("trims leading and trailing whitespace", () => {
    expect(stripTags("  <p>hello</p>  ")).toBe("hello");
  });

  test("handles newlines between tags", () => {
    expect(stripTags("<p>line one</p>\n<p>line two</p>")).toBe("line one line two");
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test("handles a string that is only tags with no text content", () => {
    expect(stripTags("<div><br /><hr /></div>")).toBe("");
  });

  test("does not strip text that looks like a less-than comparison", () => {
    // Our regex only strips well-formed <tag> patterns; bare < in text is left alone
    expect(stripTags("5 < 10")).toBe("5 < 10");
  });
});
