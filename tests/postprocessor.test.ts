import { describe, test, expect } from "bun:test";
import { Postprocessor } from "../src/postprocessor.ts";
import { Result } from "../src/results.ts";
import type { IPostprocessorPlugin, IResult } from "../src/interfaces.ts";

function makeResult(id: string): Result {
  const result = new Result(id);
  result.score = 1;
  result.locations = [{ originalWord: "hello", location: 0 }];
  return result;
}

function makePlugin(name: string, transform: (result: IResult) => IResult): IPostprocessorPlugin {
  return {
    name,
    async process(result: IResult): Promise<IResult> {
      return transform(result);
    },
  };
}

describe("Postprocessor", () => {
  describe("register", () => {
    test("returns `this` for fluent chaining", () => {
      const p = new Postprocessor();
      const plugin = makePlugin("noop", (r) => r);
      expect(p.register(plugin)).toBe(p);
    });

    test("supports chaining multiple register calls", () => {
      const p = new Postprocessor();
      expect(() =>
        p.register(makePlugin("a", (r) => r)).register(makePlugin("b", (r) => r)),
      ).not.toThrow();
    });
  });

  describe("process", () => {
    test("returns a clone (identity) of the result when no plugins are registered", async () => {
      const p = new Postprocessor();
      const result = makeResult("1");
      const processed = await p.process(result);
      expect(processed).toEqual(result);
      expect(processed).not.toBe(result); // structuredClone, not same reference
    });

    test("runs a single registered plugin", async () => {
      const p = new Postprocessor();
      p.register(
        makePlugin("scorer-boost", (r) => {
          r.score *= 2;
          return r;
        }),
      );
      const result = makeResult("1");
      const processed = await p.process(result);
      expect(processed.score).toBe(2);
    });

    test("runs plugins in registration order, threading output to input", async () => {
      const p = new Postprocessor();
      const order: string[] = [];
      p.register(
        makePlugin("first", (r) => {
          order.push("first");
          r.score += 1;
          return r;
        }),
      );
      p.register(
        makePlugin("second", (r) => {
          order.push("second");
          r.score *= 10;
          return r;
        }),
      );

      const result = makeResult("1"); // score starts at 1
      const processed = await p.process(result);

      expect(order).toEqual(["first", "second"]);
      expect(processed.score).toBe(20); // (1 + 1) * 10
    });

    test("does not mutate the original result object", async () => {
      const p = new Postprocessor();
      p.register(
        makePlugin("mutator", (r) => {
          r.score = 999;
          return r;
        }),
      );
      const result = makeResult("1");
      await p.process(result);
      expect(result.score).toBe(1); // untouched — process() clones first
    });
  });
});
