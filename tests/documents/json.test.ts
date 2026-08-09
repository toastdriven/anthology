import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { JSONDocumentStore } from "../../src/documents/json.ts";
import type { Document } from "../../src/types.ts";
import { rmSync, mkdirSync } from "node:fs";

const TMP_DIR = "./tests/tmp/json-documents";

describe("JSONDocumentStore", () => {
  beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  describe("length / addDocument / getDocument", () => {
    test("is 0 for a new store", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      expect(await store.length()).toBe(0);
    });

    test("stores and retrieves a document by id", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      const doc: Document = { id: "1", content: "hello world" };
      await store.addDocument(doc);
      expect(await store.getDocument("1")).toEqual(doc);
      expect(await store.length()).toBe(1);
    });

    test("getDocument throws for an unknown id", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      expect(store.getDocument("missing")).rejects.toThrow("Document 'missing' could not be found");
    });
  });

  describe("getDocumentLength", () => {
    test("returns the character length of the document's content", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.addDocument({ id: "1", content: "hello world" }); // 11 chars
      expect(await store.getDocumentLength("1")).toBe(11);
    });
  });

  describe("deleteDocument", () => {
    test("removes the document from in-memory storage", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.addDocument({ id: "1", content: "hello" });
      await store.deleteDocument("1");
      expect(store.getDocument("1")).rejects.toThrow();
    });
  });

  describe("serialize / deserialize", () => {
    test("serialize returns a plain object keyed by document id", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.addDocument({ id: "1", content: "hello" });
      await store.addDocument({ id: "2", content: "world" });
      expect(store.serialize()).toEqual({
        "1": { id: "1", content: "hello" },
        "2": { id: "2", content: "world" },
      });
    });

    test("deserialize reconstructs a Map from a plain object", () => {
      const store = new JSONDocumentStore(TMP_DIR);
      const raw = { "1": { id: "1", content: "hello" } };
      const map = store.deserialize(raw);
      expect(map.get("1")).toEqual({ id: "1", content: "hello" });
    });
  });

  describe("load — runtime validation", () => {
    test("throws when the persisted file contains a malformed document (missing content)", async () => {
      await Bun.file(`${TMP_DIR}/index.json`).write(
        JSON.stringify({ "1": { id: "1" } }),
      );
      const store = new JSONDocumentStore(TMP_DIR);
      expect(store.load()).rejects.toThrow();
    });

    test("throws when the persisted file is not an object of documents", async () => {
      await Bun.file(`${TMP_DIR}/index.json`).write(JSON.stringify(["not", "a", "record"]));
      const store = new JSONDocumentStore(TMP_DIR);
      expect(store.load()).rejects.toThrow();
    });

    test("succeeds and loads data when the persisted file is well-formed", async () => {
      await Bun.file(`${TMP_DIR}/index.json`).write(
        JSON.stringify({ "1": { id: "1", content: "hello" } }),
      );
      const store = new JSONDocumentStore(TMP_DIR);
      await store.load();
      expect(await store.getDocument("1")).toEqual({ id: "1", content: "hello" });
    });
  });

  describe("makeFilePath", () => {
    test("appends index.json to the storage path", () => {
      const store = new JSONDocumentStore("/some/path");
      expect(store.makeFilePath()).toBe("/some/path/index.json");
    });

    test("defaults storagePath to DATA_ROOT/documents when omitted", () => {
      const store = new JSONDocumentStore();
      expect(store.storagePath).toBe("/var/log/anthology/data/documents");
    });
  });

  // ---------------------------------------------------------------------------
  // addDocument()/deleteDocument()/clear() all set #isDirty, so save() (which
  // early-returns when not dirty) actually persists after every mutation, not
  // just clear(). See AGENTS.md "Known issues" — this was previously a bug
  // (JSONDocumentStore dirty-flag bug), now fixed.
  // ---------------------------------------------------------------------------
  describe("save/load persistence", () => {
    test("addDocument persists to disk immediately", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.addDocument({ id: "1", content: "hello" });
      const exists = await Bun.file(store.makeFilePath()).exists();
      expect(exists).toBe(true);
      expect(await Bun.file(store.makeFilePath()).json()).toEqual({
        "1": { id: "1", content: "hello" },
      });
    });

    test("deleteDocument persists the removal to disk", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.addDocument({ id: "1", content: "hello" });
      await store.deleteDocument("1");
      const exists = await Bun.file(store.makeFilePath()).exists();
      expect(exists).toBe(true);
      expect(await Bun.file(store.makeFilePath()).json()).toEqual({});
    });

    test("clear() persists an empty file", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.clear();
      const exists = await Bun.file(store.makeFilePath()).exists();
      expect(exists).toBe(true);
      expect(await Bun.file(store.makeFilePath()).json()).toEqual({});
    });

    test("load is a no-op when the file does not exist", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.load();
      expect(await store.length()).toBe(0);
    });

    test("data added via addDocument survives on a fresh instance (real persistence)", async () => {
      const writer = new JSONDocumentStore(TMP_DIR);
      await writer.addDocument({ id: "1", content: "hello" });

      const reader = new JSONDocumentStore(TMP_DIR);
      await reader.load();
      expect(await reader.length()).toBe(1);
      expect(await reader.getDocument("1")).toEqual({ id: "1", content: "hello" });
    });

    test("a deleted document does not reappear on a fresh instance", async () => {
      const writer = new JSONDocumentStore(TMP_DIR);
      await writer.addDocument({ id: "1", content: "hello" });
      await writer.deleteDocument("1");

      const reader = new JSONDocumentStore(TMP_DIR);
      await reader.load();
      expect(await reader.length()).toBe(0);
      expect(reader.getDocument("1")).rejects.toThrow();
    });

    test("a manual save() after clear()+addDocument includes the later addition (isDirty set again by addDocument)", async () => {
      const store = new JSONDocumentStore(TMP_DIR);
      await store.clear(); // sets dirty, saves empty file, resets dirty
      await store.addDocument({ id: "1", content: "hello" }); // sets dirty again, saves inline
      await store.save(); // already saved by addDocument; this is a no-op re-save
      const persisted = await Bun.file(store.makeFilePath()).json();
      expect(persisted).toEqual({ "1": { id: "1", content: "hello" } });
    });
  });
});
