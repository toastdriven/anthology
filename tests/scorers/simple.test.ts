import { describe, test, expect } from "bun:test";
import { SimpleScorer } from "../../src/scorers/simple.ts";
import { Result } from "../../src/results.ts";

function makeResult(docLength: number, locations: { originalWord: string; location: number }[]): Result {
  const result = new Result("1");
  result.docLength = docLength;
  result.locations = locations;
  return result;
}

describe("SimpleScorer", () => {
  const scorer = new SimpleScorer();

  test("scores as total matched word length / document length", async () => {
    const result = makeResult(10, [{ originalWord: "hello", location: 0 }]); // 5 chars
    const scored = await scorer.score(result);
    expect(scored.score).toBe(0.5);
  });

  test("sums the length of multiple matched words", async () => {
    const result = makeResult(20, [
      { originalWord: "hello", location: 0 }, // 5
      { originalWord: "world", location: 6 }, // 5
    ]); // 10 / 20
    const scored = await scorer.score(result);
    expect(scored.score).toBe(0.5);
  });

  test("returns 0 when there are no locations", async () => {
    const result = makeResult(10, []);
    const scored = await scorer.score(result);
    expect(scored.score).toBe(0);
  });

  test("returns 0 when docLength is 0 (avoids division by zero)", async () => {
    const result = makeResult(0, [{ originalWord: "hello", location: 0 }]);
    const scored = await scorer.score(result);
    expect(scored.score).toBe(0);
  });

  test("score can exceed 1 if matched words are longer than reported docLength", async () => {
    // Not a "real" scenario, but documents current (unclamped) behaviour.
    const result = makeResult(2, [{ originalWord: "hello", location: 0 }]); // 5 / 2
    const scored = await scorer.score(result);
    expect(scored.score).toBe(2.5);
  });

  test("mutates and returns the same result object", async () => {
    const result = makeResult(10, [{ originalWord: "hi", location: 0 }]);
    const scored = await scorer.score(result);
    expect(scored).toBe(result);
  });

  test("resets score to 0 before recomputing (idempotent across repeated calls)", async () => {
    const result = makeResult(10, [{ originalWord: "hello", location: 0 }]);
    await scorer.score(result);
    await scorer.score(result);
    expect(result.score).toBe(0.5);
  });
});
