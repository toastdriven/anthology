import type { ViewContext } from "../context";
import type { Document } from "../types";

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
      // FIXME: Needs validation
      const data = await req.json() as unknown as Document;
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
