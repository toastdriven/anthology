import type { ViewContext } from "../types";

export function makeHealthViews({ engine }: ViewContext) {
  return {
    async healthCheck(req: Bun.BunRequest): Promise<Response> {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    },
  };
}
