import { describe, test, expect } from "bun:test";
import { makeStatsViews } from "../../src/views/stats.ts";
import { makeMockEngine, makeRequest } from "../helpers.ts";
import { VERSION } from "../../src/constants.ts";

const BASE_URL = "http://localhost/stats";

function makeViews(overrides: Parameters<typeof makeMockEngine>[0] = {}) {
  return makeStatsViews({ engine: makeMockEngine(overrides) });
}

describe("generalStats", () => {
  test("returns 200", async () => {
    const views = makeViews();
    const req = makeRequest(BASE_URL);
    const res = await views.generalStats(req);
    expect(res.status).toBe(200);
  });

  test("includes the current version", async () => {
    const views = makeViews();
    const req = makeRequest(BASE_URL);
    const res = await views.generalStats(req);
    const body = await res.json();
    expect(body.version).toBe(VERSION);
  });

  test("response is valid JSON", async () => {
    const views = makeViews();
    const req = makeRequest(BASE_URL);
    const res = await views.generalStats(req);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
