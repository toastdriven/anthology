import { describe, test, expect, mock } from "bun:test";
import { makeSearchViews } from "../../src/views/search.ts";
import type { Result } from "../../src/results.ts";
import { makeMockEngine, makeRequest, makeResult } from "../helpers.ts";

const BASE_URL = "http://localhost/search/basic";

function makeViews(overrides: Parameters<typeof makeMockEngine>[0] = {}) {
  return makeSearchViews({ engine: makeMockEngine(overrides) });
}

describe("basicSearch", () => {
  // --- input validation -----------------------------------------------------

  test("returns 400 when `q` param is absent", async () => {
    const views = makeViews();
    const req = makeRequest(BASE_URL);
    const res = await views.basicSearch(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors).toBeArray();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test("returns 400 when `q` param is an empty string", async () => {
    const views = makeViews();
    const req = makeRequest(`${BASE_URL}?q=`);
    const res = await views.basicSearch(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // --- happy path -----------------------------------------------------------

  test("returns 200 with the resolved results array", async () => {
    const views = makeViews({ search: async () => [makeResult("1"), makeResult("2")] });
    const req = makeRequest(`${BASE_URL}?q=hello`);
    const res = await views.basicSearch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results).toBeArray();
    expect(body.results.map((r: { id: string }) => r.id)).toEqual(["1", "2"]);
  });

  test("echoes the query back in the response", async () => {
    const views = makeViews();
    const req = makeRequest(`${BASE_URL}?q=hello+world`);
    const res = await views.basicSearch(req);
    const body = await res.json();
    expect(body.query).toBe("hello world");
  });

  test("returns an empty results array when the mock resolves an empty array", async () => {
    const views = makeViews({ search: async () => [] });
    const req = makeRequest(`${BASE_URL}?q=unknownterm`);
    const res = await views.basicSearch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results).toEqual([]);
  });

  // --- engine delegation ----------------------------------------------------

  test("calls engine.search with the query string", async () => {
    const search = mock(async (_query: string): Promise<Result[]> => []);
    const views = makeViews({ search });
    const req = makeRequest(`${BASE_URL}?q=cats`);
    await views.basicSearch(req);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("cats");
  });

  test("does not call engine.search when query is invalid", async () => {
    const search = mock(async (_query: string): Promise<Result[]> => []);
    const views = makeViews({ search });
    const req = makeRequest(BASE_URL); // no `q`
    await views.basicSearch(req);
    expect(search).toHaveBeenCalledTimes(0);
  });
});
