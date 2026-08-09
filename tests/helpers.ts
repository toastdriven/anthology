/**
 * Shared test helpers.
 */
import type { ISearchEngine } from "../src/interfaces.ts";
import { Result, Results } from "../src/results.ts";
import type { Document } from "../src/types.ts";

// ---------------------------------------------------------------------------
// Mock engine
// ---------------------------------------------------------------------------

export function makeMockEngine(overrides: Partial<ISearchEngine> = {}): ISearchEngine {
  return {
    setUp: async () => {},
    clear: async (): Promise<boolean> => true,
    indexSize: async (): Promise<number> => 0,
    documentStoreSize: async (): Promise<number> => 0,
    getDocument: async (_id: string): Promise<Document> => ({ id: "1", content: "hello" }),
    addDocument: async (_doc: Document): Promise<void> => {},
    deleteDocument: async (_id: string): Promise<void> => {},
    rawSearch: async (_query: string): Promise<Results> => new Results({
      length: async () => 0,
      getDocument: async () => { throw new Error("not implemented in mock"); },
      getDocumentLength: async () => 0,
      addDocument: async () => true,
      deleteDocument: async () => true,
      clear: async () => true,
      load: async () => {},
      save: async () => {},
    }),
    search: async (_query: string): Promise<Result[]> => [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock request builder
// ---------------------------------------------------------------------------

/**
 * Builds a Bun.BunRequest-compatible object.
 * `params` are attached directly to match what Bun injects at route-match time.
 */
export function makeRequest(
  url: string,
  params: Record<string, string> = {},
  init?: RequestInit,
): Bun.BunRequest {
  return Object.assign(new Request(url, init), { params }) as Bun.BunRequest;
}

// ---------------------------------------------------------------------------
// Mock result builder
// ---------------------------------------------------------------------------

/**
 * Builds a `Result`-shaped object for use in view/engine mocks.
 */
export function makeResult(id: string, overrides: Partial<Result> = {}): Result {
  const result = new Result(id);
  return Object.assign(result, overrides);
}
