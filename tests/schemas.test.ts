import { describe, test, expect } from "bun:test";
import {
  DocumentSchema,
  VectorSchema,
  SerializedDocumentsSchema,
  SerializedIndexSchema,
} from "../src/schemas.ts";

describe("DocumentSchema", () => {
  test("accepts a valid document without contentType", () => {
    const result = DocumentSchema.parse({ id: "1", content: "hello" });
    expect(result).toEqual({ id: "1", content: "hello" });
  });

  test("accepts a valid document with contentType", () => {
    const result = DocumentSchema.parse({ id: "1", content: "<p>hi</p>", contentType: "text/html" });
    expect(result.contentType).toBe("text/html");
  });

  test("rejects a document missing content", () => {
    expect(() => DocumentSchema.parse({ id: "1" })).toThrow();
  });

  test("rejects a document with a non-string id", () => {
    expect(() => DocumentSchema.parse({ id: 1, content: "hello" })).toThrow();
  });
});

describe("VectorSchema", () => {
  test("accepts a valid vector", () => {
    const result = VectorSchema.parse({ id: "1", originalWord: "hello", location: 0 });
    expect(result).toEqual({ id: "1", originalWord: "hello", location: 0 });
  });

  test("rejects a vector missing location", () => {
    expect(() => VectorSchema.parse({ id: "1", originalWord: "hello" })).toThrow();
  });

  test("rejects a vector with a non-numeric location", () => {
    expect(() => VectorSchema.parse({ id: "1", originalWord: "hello", location: "0" })).toThrow();
  });
});

describe("SerializedDocumentsSchema", () => {
  test("accepts an empty record", () => {
    expect(SerializedDocumentsSchema.parse({})).toEqual({});
  });

  test("accepts a record of valid documents", () => {
    const raw = { "1": { id: "1", content: "hello" } };
    expect(SerializedDocumentsSchema.parse(raw)).toEqual(raw);
  });

  test("rejects a record containing a malformed document", () => {
    expect(() => SerializedDocumentsSchema.parse({ "1": { id: "1" } })).toThrow();
  });

  test("rejects a non-object payload (e.g. an array)", () => {
    expect(() => SerializedDocumentsSchema.parse(["not", "a", "record"])).toThrow();
  });
});

describe("SerializedIndexSchema", () => {
  test("accepts an empty record", () => {
    expect(SerializedIndexSchema.parse({})).toEqual({});
  });

  test("accepts a record of term -> vector[]", () => {
    const raw = { cat: [{ id: "1", originalWord: "cat", location: 0 }] };
    expect(SerializedIndexSchema.parse(raw)).toEqual(raw);
  });

  test("rejects a term whose value isn't an array", () => {
    expect(() => SerializedIndexSchema.parse({ cat: "not-an-array" })).toThrow();
  });

  test("rejects a vector missing a required field", () => {
    expect(() => SerializedIndexSchema.parse({ cat: [{ id: "1", originalWord: "cat" }] })).toThrow();
  });
});
