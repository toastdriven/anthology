import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { JSONIndex } from "../../src/indexes/json";
import type { TermVector } from "../../src/types";
import { rmSync, mkdirSync } from "node:fs";

const TMP_DIR = "./tests/tmp/json-index";

describe("JSONIndex", () => {
  beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Constructor / basic API (mirrors InMemoryIndex behaviour)
  // ---------------------------------------------------------------------------

  describe("getTerm", () => {
    test("returns empty array for unknown term", async () => {
      const index = new JSONIndex(TMP_DIR);
      expect(await index.getTerm("missing")).toEqual([]);
    });

    test("returns vectors for a known term", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "hello", vector: { id: "1", originalWord: "w1", location: 0 } });
      expect(await index.getTerm("hello")).toEqual([{ id: "1", originalWord: "w1", location: 0 }]);
    });

    test("returns a copy, not the internal array", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "hello", vector: { id: "1", originalWord: "w1", location: 0 } });
      const result = await index.getTerm("hello");
      result.push({ id: "mutant", originalWord: "wmutant", location: 99 });
      expect(await index.getTerm("hello")).toHaveLength(1);
    });
  });

  describe("addTerm", () => {
    test("accumulates multiple vectors for the same term", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await index.addTerm({ term: "cat", vector: { id: "2", originalWord: "w2", location: 5 } });
      expect(await index.getTerm("cat")).toEqual([
        { id: "1", originalWord: "w1", location: 0 },
        { id: "2", originalWord: "w2", location: 5 },
      ]);
    });

    test("does not add exact duplicates", async () => {
      const index = new JSONIndex(TMP_DIR);
      const tv: TermVector = { term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } };
      await index.addTerm(tv);
      await index.addTerm(tv);
      expect(await index.getTerm("cat")).toHaveLength(1);
    });
  });

  describe("deleteDocument", () => {
    test("removes all vectors for a docId across all terms", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await index.addTerm({ term: "cat", vector: { id: "2", originalWord: "w2", location: 0 } });
      await index.addTerm({ term: "dog", vector: { id: "1", originalWord: "w1", location: 4 } });
      await index.deleteDocument("1");
      expect(await index.getTerm("cat")).toEqual([{ id: "2", originalWord: "w2", location: 0 }]);
      expect(await index.getTerm("dog")).toEqual([]);
    });

    test("is a no-op for an unknown docId", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await index.deleteDocument("999");
      expect(await index.getTerm("cat")).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // serialize / deserialize
  // ---------------------------------------------------------------------------

  describe("serialize", () => {
    test("returns a plain object (JSON-safe)", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await index.addTerm({ term: "dog", vector: { id: "2", originalWord: "w2", location: 4 } });
      const serialized = index.serialize();
      expect(serialized).toEqual({
        cat: [{ id: "1", originalWord: "w1", location: 0 }],
        dog: [{ id: "2", originalWord: "w2", location: 4 }],
      });
    });

    test("round-trips through JSON.stringify without data loss", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      const json = JSON.stringify(index.serialize());
      expect(JSON.parse(json)).toEqual({ cat: [{ id: "1", originalWord: "w1", location: 0 }] });
    });

    test("returns empty object when index is empty", () => {
      const index = new JSONIndex(TMP_DIR);
      expect(index.serialize()).toEqual({});
    });
  });

  describe("deserialize", () => {
    test("reconstructs data from a plain object", () => {
      const index = new JSONIndex(TMP_DIR);
      const raw = { cat: [{ id: "1", originalWord: "w1", location: 0 }] };
      const map = index.deserialize(raw);
      expect(map.get("cat")).toEqual([{ id: "1", originalWord: "w1", location: 0 }]);
    });

    test("returns an empty Map for an empty object", () => {
      const index = new JSONIndex(TMP_DIR);
      const map = index.deserialize({});
      expect(map.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // save / load
  // ---------------------------------------------------------------------------

  describe("save + load", () => {
    test("load is a no-op when the file does not exist", async () => {
      const index = new JSONIndex(TMP_DIR);
      // Should not throw; data stays empty
      await index.load();
      expect(await index.getTerm("anything")).toEqual([]);
    });

    test("save writes a valid JSON file to disk", async () => {
      const index = new JSONIndex(TMP_DIR);
      await index.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await index.save();
      const file = Bun.file(index.makeFilePath());
      const parsed = await file.json();
      expect(parsed).toEqual({ cat: [{ id: "1", originalWord: "w1", location: 0 }] });
    });

    test("save skips writing when nothing has changed", async () => {
      const index = new JSONIndex(TMP_DIR);
      // No addTerm calls — #isDirty is false
      await index.save();
      const file = Bun.file(index.makeFilePath());
      expect(await file.exists()).toBe(false);
    });

    test("load restores data saved by save", async () => {
      const writer = new JSONIndex(TMP_DIR);
      await writer.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await writer.addTerm({ term: "dog", vector: { id: "2", originalWord: "w2", location: 4 } });
      await writer.save();

      const reader = new JSONIndex(TMP_DIR);
      await reader.load();
      expect(await reader.getTerm("cat")).toEqual([{ id: "1", originalWord: "w1", location: 0 }]);
      expect(await reader.getTerm("dog")).toEqual([{ id: "2", originalWord: "w2", location: 4 }]);
    });

    test("loaded index is fully functional (addTerm, deleteDocument)", async () => {
      const writer = new JSONIndex(TMP_DIR);
      await writer.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await writer.save();

      const index = new JSONIndex(TMP_DIR);
      await index.load();
      await index.addTerm({ term: "dog", vector: { id: "2", originalWord: "w2", location: 0 } });
      expect(await index.getTerm("dog")).toEqual([{ id: "2", originalWord: "w2", location: 0 }]);
      await index.deleteDocument("1");
      expect(await index.getTerm("cat")).toEqual([]);
    });

    test("save after load only writes when dirty", async () => {
      const writer = new JSONIndex(TMP_DIR);
      await writer.addTerm({ term: "cat", vector: { id: "1", originalWord: "w1", location: 0 } });
      await writer.save();

      const index = new JSONIndex(TMP_DIR);
      await index.load();
      // No mutations — a subsequent save should not overwrite the file with new mtime
      const statBefore = Bun.file(index.makeFilePath()).size;
      await index.save();
      const statAfter = Bun.file(index.makeFilePath()).size;
      expect(statAfter).toBe(statBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // load — runtime validation
  // ---------------------------------------------------------------------------

  describe("load — runtime validation", () => {
    test("throws when the persisted file contains a malformed vector (missing location)", async () => {
      await Bun.file(`${TMP_DIR}/index.json`).write(
        JSON.stringify({ cat: [{ id: "1", originalWord: "w1" }] }),
      );
      const index = new JSONIndex(TMP_DIR);
      expect(index.load()).rejects.toThrow();
    });

    test("throws when the persisted file is not a record of term -> vector[]", async () => {
      await Bun.file(`${TMP_DIR}/index.json`).write(JSON.stringify({ cat: "not-an-array" }));
      const index = new JSONIndex(TMP_DIR);
      expect(index.load()).rejects.toThrow();
    });

    test("succeeds and loads data when the persisted file is well-formed", async () => {
      await Bun.file(`${TMP_DIR}/index.json`).write(
        JSON.stringify({ cat: [{ id: "1", originalWord: "w1", location: 0 }] }),
      );
      const index = new JSONIndex(TMP_DIR);
      await index.load();
      expect(await index.getTerm("cat")).toEqual([{ id: "1", originalWord: "w1", location: 0 }]);
    });
  });

  // ---------------------------------------------------------------------------
  // makeFilePath
  // ---------------------------------------------------------------------------

  describe("makeFilePath", () => {
    test("appends index.json to the storage path", () => {
      const index = new JSONIndex("/some/path");
      expect(index.makeFilePath()).toBe("/some/path/index.json");
    });
  });
});
