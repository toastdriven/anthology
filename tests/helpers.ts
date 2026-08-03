/**
 * Shared test helpers.
 */
import type { SearchEngine } from "../src/engine.ts";
import type { Document } from "../src/types.ts";

// ---------------------------------------------------------------------------
// Mock engine
// ---------------------------------------------------------------------------

export function makeMockEngine(overrides: Partial<Record<keyof SearchEngine, unknown>> = {}): SearchEngine {
  return {
    setUp: async () => {},
    getDocument: async (_id: string): Promise<Document> => ({ id: "1", content: "hello" }),
    addDocument: async (_doc: Document): Promise<void> => {},
    deleteDocument: async (_id: string): Promise<void> => {},
    search: (_query: string): string[] => [],
    ...overrides,
  } as unknown as SearchEngine;
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
