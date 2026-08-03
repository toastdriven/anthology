import { describe, test, expect, mock } from "bun:test";
import { makeSearchViews } from "../../src/views/search.ts";
import { makeMockEngine, makeRequest } from "../helpers.ts";

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

  test("returns 200 with results on a valid query", async () => {
    const views = makeViews({ search: () => ["1", "2"] });
    const req = makeRequest(`${BASE_URL}?q=hello`);
    const res = await views.basicSearch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results).toEqual(["1", "2"]);
  });

  test("echoes the query back in the response", async () => {
    const views = makeViews();
    const req = makeRequest(`${BASE_URL}?q=hello+world`);
    const res = await views.basicSearch(req);
    const body = await res.json();
    expect(body.query).toBe("hello world");
  });

  test("returns an empty results array when no documents match", async () => {
    const views = makeViews({ search: () => [] });
    const req = makeRequest(`${BASE_URL}?q=unknownterm`);
    const res = await views.basicSearch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results).toEqual([]);
  });

  // --- engine delegation ----------------------------------------------------

  test("calls engine.search with the query string", async () => {
    const search = mock((_query: string): string[] => []);
    const views = makeViews({ search });
    const req = makeRequest(`${BASE_URL}?q=cats`);
    await views.basicSearch(req);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("cats");
  });

  test("does not call engine.search when query is invalid", async () => {
    const search = mock((_query: string): string[] => []);
    const views = makeViews({ search });
    const req = makeRequest(BASE_URL); // no `q`
    await views.basicSearch(req);
    expect(search).toHaveBeenCalledTimes(0);
  });
});
