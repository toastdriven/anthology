import { VERSION } from '../constants';
import type { ViewContext } from "../types";

export function makeStatsViews({ engine }: ViewContext) {
  return {
    async generalStats(req: Bun.BunRequest): Promise<Response> {
      return Response.json({
        version: VERSION,
        runtime: Bun.version_with_sha,
        indexSize: await engine.indexSize(),
        indexedDocuments: await engine.documentStoreSize(),
        // FIXME: Other metrics should probably be Prometheus-instrumented?
        //     Or left as an exercise for extension?
      });
    },
  };
}
