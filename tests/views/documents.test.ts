import { describe, test, expect, mock } from "bun:test";
import { makeDocumentViews } from "../../src/views/documents.ts";
import { makeMockEngine, makeRequest } from "../helpers.ts";
import type { Document } from "../../src/types.ts";

const BASE_URL = "http://localhost/documents/";

const SAMPLE_DOC: Document = { id: "42", content: "hello world" };

function makeViews(overrides: Parameters<typeof makeMockEngine>[0] = {}) {
  return makeDocumentViews({ engine: makeMockEngine(overrides) });
}

// ---------------------------------------------------------------------------
// getDocument
// ---------------------------------------------------------------------------

describe("getDocument", () => {
  test("returns 400 when id param is missing", async () => {
    const views = makeViews();
    const req = makeRequest(BASE_URL, { id: "" });
    const res = await views.getDocument(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors).toBeArray();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test("returns 200 and the document on success", async () => {
    const views = makeViews({
      getDocument: async () => SAMPLE_DOC,
    });
    const req = makeRequest(`${BASE_URL}42`, { id: "42" });
    const res = await views.getDocument(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.document).toEqual(SAMPLE_DOC);
  });

  test("calls engine.getDocument with the correct id", async () => {
    const getDocument = mock(async (_id: string) => SAMPLE_DOC);
    const views = makeViews({ getDocument });
    const req = makeRequest(`${BASE_URL}42`, { id: "42" });
    await views.getDocument(req);
    expect(getDocument).toHaveBeenCalledTimes(1);
    expect(getDocument.mock.calls[0]?.[0]).toBe("42");
  });
});

// ---------------------------------------------------------------------------
// updateDocument
// ---------------------------------------------------------------------------

describe("updateDocument", () => {
  test("returns 202 on success", async () => {
    const views = makeViews();
    const req = makeRequest(
      `${BASE_URL}42`,
      { id: "42" },
      {
        method: "POST",
        body: JSON.stringify(SAMPLE_DOC),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await views.updateDocument(req);
    expect(res.status).toBe(202);
  });

  test("calls engine.addDocument with the parsed body", async () => {
    const addDocument = mock(async (_doc: Document) => {});
    const views = makeViews({ addDocument });
    const req = makeRequest(
      `${BASE_URL}42`,
      { id: "42" },
      {
        method: "POST",
        body: JSON.stringify(SAMPLE_DOC),
        headers: { "Content-Type": "application/json" },
      },
    );
    await views.updateDocument(req);
    expect(addDocument).toHaveBeenCalledTimes(1);
    expect(addDocument.mock.calls[0]?.[0]).toEqual(SAMPLE_DOC);
  });

  test("returns 400 and does not call engine.addDocument when the body is missing required fields", async () => {
    const addDocument = mock(async (_doc: Document) => {});
    const views = makeViews({ addDocument });
    const req = makeRequest(
      `${BASE_URL}42`,
      { id: "42" },
      {
        method: "POST",
        body: JSON.stringify({ id: "42" }), // missing `content`
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await views.updateDocument(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors).toBeArray();
    expect(body.errors.length).toBeGreaterThan(0);
    expect(addDocument).not.toHaveBeenCalled();
  });

  test("returns 400 and does not call engine.addDocument when a field has the wrong type", async () => {
    const addDocument = mock(async (_doc: Document) => {});
    const views = makeViews({ addDocument });
    const req = makeRequest(
      `${BASE_URL}42`,
      { id: "42" },
      {
        method: "POST",
        body: JSON.stringify({ id: 42, content: "hello" }), // id should be a string
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await views.updateDocument(req);
    expect(res.status).toBe(400);
    expect(addDocument).not.toHaveBeenCalled();
  });

  test("returns 400 and does not call engine.addDocument when the body is not valid JSON", async () => {
    const addDocument = mock(async (_doc: Document) => {});
    const views = makeViews({ addDocument });
    const req = makeRequest(
      `${BASE_URL}42`,
      { id: "42" },
      {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await views.updateDocument(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(addDocument).not.toHaveBeenCalled();
  });

  test("accepts an optional contentType", async () => {
    const addDocument = mock(async (_doc: Document) => {});
    const views = makeViews({ addDocument });
    const doc = { id: "42", content: "<p>hi</p>", contentType: "text/html" };
    const req = makeRequest(
      `${BASE_URL}42`,
      { id: "42" },
      {
        method: "POST",
        body: JSON.stringify(doc),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await views.updateDocument(req);
    expect(res.status).toBe(202);
    expect(addDocument.mock.calls[0]?.[0]).toEqual(doc);
  });
});

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------

describe("deleteDocument", () => {
  test("returns 400 when id param is missing", async () => {
    const views = makeViews();
    const req = makeRequest(BASE_URL, { id: "" });
    const res = await views.deleteDocument(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors).toBeArray();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test("returns 200 and the deleted id on success", async () => {
    const views = makeViews();
    const req = makeRequest(`${BASE_URL}42`, { id: "42" });
    const res = await views.deleteDocument(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBe("42");
  });

  test("calls engine.deleteDocument with the correct id", async () => {
    const deleteDocument = mock(async (_id: string) => {});
    const views = makeViews({ deleteDocument });
    const req = makeRequest(`${BASE_URL}42`, { id: "42" });
    await views.deleteDocument(req);
    expect(deleteDocument).toHaveBeenCalledTimes(1);
    expect(deleteDocument.mock.calls[0]?.[0]).toBe("42");
  });
});
