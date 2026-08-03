import { VERSION } from '../constants';
import type { ViewContext } from "../context";
import type { Document } from "../types";

export function makeStatsViews({ engine }: ViewContext) {
  return {
    async generalStats(req: Bun.BunRequest): Promise<Response> {
      return Response.json({
        version: VERSION,
        // FIXME: More details would be nice:
        //     * total documents indexed
        //     * total terms indexed
        // FIXME: Other metrics should probably be Prometheus-instrumented?
        //     Or left as an exercise for extension?
      });
    },
  };
}
