import { describe, test, expect, beforeEach } from "bun:test";
import { InMemoryDocumentStore } from "../../src/documents/in-memory.ts";
import type { Document } from "../../src/types.ts";

describe("InMemoryDocumentStore", () => {
  let store: InMemoryDocumentStore;

  beforeEach(() => {
    store = new InMemoryDocumentStore();
  });

  describe("length", () => {
    test("is 0 for a new store", async () => {
      expect(await store.length()).toBe(0);
    });

    test("reflects the number of stored documents", async () => {
      await store.addDocument({ id: "1", content: "hello" });
      await store.addDocument({ id: "2", content: "world" });
      expect(await store.length()).toBe(2);
    });
  });

  describe("addDocument / getDocument", () => {
    test("stores and retrieves a document by id", async () => {
      const doc: Document = { id: "1", content: "hello world" };
      await store.addDocument(doc);
      expect(await store.getDocument("1")).toEqual(doc);
    });

    test("addDocument returns true", async () => {
      expect(await store.addDocument({ id: "1", content: "hello" })).toBe(true);
    });

    test("overwrites a document with the same id", async () => {
      await store.addDocument({ id: "1", content: "first" });
      await store.addDocument({ id: "1", content: "second" });
      expect((await store.getDocument("1")).content).toBe("second");
      expect(await store.length()).toBe(1);
    });

    test("getDocument throws for an unknown id", async () => {
      expect(store.getDocument("missing")).rejects.toThrow("Document 'missing' could not be found");
    });
  });

  describe("getDocumentLength", () => {
    test("returns the character length of the document's content", async () => {
      await store.addDocument({ id: "1", content: "hello world" }); // 11 chars
      expect(await store.getDocumentLength("1")).toBe(11);
    });

    test("throws for an unknown id", async () => {
      expect(store.getDocumentLength("missing")).rejects.toThrow();
    });
  });

  describe("deleteDocument", () => {
    test("removes a document and returns true", async () => {
      await store.addDocument({ id: "1", content: "hello" });
      expect(await store.deleteDocument("1")).toBe(true);
      expect(await store.length()).toBe(0);
    });

    test("returns false when deleting an unknown id", async () => {
      expect(await store.deleteDocument("missing")).toBe(false);
    });

    test("deleted document can no longer be retrieved", async () => {
      await store.addDocument({ id: "1", content: "hello" });
      await store.deleteDocument("1");
      expect(store.getDocument("1")).rejects.toThrow();
    });
  });

  describe("clear", () => {
    test("removes all documents and returns true", async () => {
      await store.addDocument({ id: "1", content: "hello" });
      await store.addDocument({ id: "2", content: "world" });
      expect(await store.clear()).toBe(true);
      expect(await store.length()).toBe(0);
    });

    test("is safe to call on an already-empty store", async () => {
      expect(await store.clear()).toBe(true);
    });
  });
});
