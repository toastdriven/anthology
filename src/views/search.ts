import type { ViewContext } from "../types";

export function makeSearchViews({ engine }: ViewContext) {
  return {
    async basicSearch(req: Bun.BunRequest): Promise<Response> {
      const query = new URL(req.url).searchParams.get('q');
      let respData;

      if (!query || query.length === 0) {
        respData = {
          success: false,
          errors: ['You must provide the `q` query param.'],
        };
        return Response.json(respData, { status: 400 });
      }

      const results = await engine.search(query);
      respData = {
        success: true,
        'query': query,
        'results': results,
      };
      return Response.json(respData);
    },
    // FIXME: *Sigh* Someday, these will be real features.
    // async autoComplete(req: Bun.BunRequest): Promise<Response> {
    //   const results = engine.search(req.params['q']);
    //   return Response.json({ results: results });
    // },
    // async moreLikeThis(req: Bun.BunRequest): Promise<Response> {
    //   const results = engine.search(req.params['q']);
    //   return Response.json({ results: results });
    // },
  };
}
