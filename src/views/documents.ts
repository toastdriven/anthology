import { z } from "zod";
import { DocumentSchema } from "../schemas";
import type { ViewContext } from "../types";

export function makeDocumentViews({ engine }: ViewContext) {
  return {
    async getDocument(req: Bun.BunRequest): Promise<Response> {
      const docId = req.params.id;
      let respData;

      if (!docId) {
        respData = {
          success: false,
          errors: ['You must provide a document id as a URL param.'],
        };
        return Response.json(respData, { status: 400 });
      }

      const document = await engine.getDocument(docId);
      respData = {
        success: true,
        'document': document,
      }
      return Response.json(respData, { status: 200 });
    },
    async updateDocument(req: Bun.BunRequest): Promise<Response> {
      // `req.json()` returns `any` — nothing here is trustworthy until
      // validated. `.parse()` throws a ZodError (bad shape, missing fields,
      // wrong types, etc.) which we catch below and turn into a 400,
      // instead of letting a malformed body reach `engine.addDocument()`
      // and fail later with a confusing, unrelated error.
      let data;
      try {
        data = DocumentSchema.parse(await req.json());
      } catch (err) {
        const errors = err instanceof z.ZodError
          ? err.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          : ['Request body must be valid JSON.'];
        return Response.json({ success: false, errors }, { status: 400 });
      }

      await engine.addDocument(data);
      let respData = {
        success: true,
        'id': data.id,
      }
      return Response.json(respData, { status: 202 });
    },
    async deleteDocument(req: Bun.BunRequest): Promise<Response> {
      const docId = req.params.id;
      let respData;

      if (!docId) {
        respData = {
          success: false,
          errors: ['You must provide a document id as a URL param.'],
        };
        return Response.json(respData, { status: 400 });
      }

      await engine.deleteDocument(docId);
      respData = {
        success: true,
        'id': docId,
      }
      return Response.json(respData, { status: 200 });
    }
  };
}
