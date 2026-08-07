import { describe, test, expect } from "bun:test";
import { createHash } from "../../src/utils/hash";

describe("createHash", () => {
  // ---------------------------------------------------------------------------
  // Default behaviour
  // ---------------------------------------------------------------------------

  test("returns a string of default length 16", () => {
    expect(createHash("hello world")).toHaveLength(16);
  });

  test("returns the expected rapidhash digest for a known input", () => {
    // Bun.hash.rapidhash("hello") === 9166712279701818032n -> 7f36b44045d68ab0
    expect(createHash("hello")).toBe("7f36b44045d68ab0");
  });

  test("returns a hex-only string", () => {
    expect(createHash("some arbitrary input")).toMatch(/^[0-9a-f]+$/);
  });

  // ---------------------------------------------------------------------------
  // Determinism / uniqueness
  // ---------------------------------------------------------------------------

  test("is deterministic for the same input", () => {
    expect(createHash("repeatable")).toBe(createHash("repeatable"));
  });

  test("produces different hashes for different input", () => {
    expect(createHash("foo")).not.toBe(createHash("bar"));
  });

  test("is case sensitive", () => {
    expect(createHash("Hello")).not.toBe(createHash("hello"));
  });

  // ---------------------------------------------------------------------------
  // hashLength parameter
  // ---------------------------------------------------------------------------

  test("honours a custom hashLength", () => {
    expect(createHash("hello world", 12)).toHaveLength(12);
  });

  test("returns the full 16-character rapidhash hex digest when hashLength exceeds it", () => {
    // rapidhash is a 64-bit hash -> 16 hex chars is the natural ceiling;
    // requesting more just returns the same 16 chars (no extra entropy to pad with).
    expect(createHash("hello world", 100)).toHaveLength(16);
  });

  test("returns an empty string when hashLength is 0", () => {
    expect(createHash("hello world", 0)).toBe("");
  });

  test("truncated hash is a prefix of the full-length hash", () => {
    const full = createHash("hello world", 16);
    const short = createHash("hello world", 7);
    expect(full.startsWith(short)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test("handles empty string input", () => {
    // Bun.hash.rapidhash("") -> 93228a4de0eec5a2
    expect(createHash("")).toBe("93228a4de0eec5a2");
  });

  test("handles unicode input without throwing", () => {
    expect(createHash("héllo wörld 😀")).toHaveLength(16);
  });

  test("handles long input strings", () => {
    const longInput = "a".repeat(10_000);
    expect(createHash(longInput)).toHaveLength(16);
  });

  test("zero-pads digests whose raw hex representation is shorter than 16 chars", () => {
    // Bun.hash.rapidhash("0") produces a 15-char raw hex (674a07b49e2c486),
    // which must be left-padded to 16 chars, not silently shortened.
    // Without padStart, requesting the full digest would return only 15 chars
    // and truncation-by-substring would slice the wrong bytes.
    expect(createHash("0", 16)).toBe("0674a07b49e2c486");
    expect(createHash("0", 16)).toHaveLength(16);
  });
});
