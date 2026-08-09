import {
  DEFAULT_HOSTNAME,
  DEFAULT_PORT,
} from './constants';
import { SearchEngine } from './engine';
import { InMemoryIndex } from './indexes/in-memory';
import { Preprocessor } from './preprocessor';
import { HTMLPreprocessor } from './preprocessors/html';
import { SimpleTokenizer } from './tokenizers/simple';
import type { ViewContext } from './types';
import { makeDocumentViews } from './views/documents';
import { makeSearchViews } from './views/search';
import { makeStatsViews } from './views/stats';

interface IServerOptions {
  engine?: SearchEngine,
  hostname?: string,
  port?: number,
}

export async function makeServer(options: IServerOptions): Promise<Bun.Server<undefined>> {
  const engine = options.engine ?? new SearchEngine({
    index: new InMemoryIndex(),
    tokenizer: new SimpleTokenizer(),
    preprocessor: new Preprocessor()
      .register(new HTMLPreprocessor())
  });
  await engine.setUp();
  const context: ViewContext = { engine };
  const docViews = makeDocumentViews(context);
  const searchViews = makeSearchViews(context);
  const statsViews = makeStatsViews(context);

  return Bun.serve({
    hostname: options.hostname ?? DEFAULT_HOSTNAME,
    port: options.port ?? DEFAULT_PORT,

    routes: {
      "/documents/:id": {
        GET: docViews.getDocument,
        POST: docViews.updateDocument,
        PUT: docViews.updateDocument,
        DELETE: docViews.deleteDocument,
      },

      "/search/basic": searchViews.basicSearch,
      // "/search/autocomplete": searchViews.autoComplete,
      // "/search/more-like-this/:id": searchViews.moreLikeThis,

      "/stats": statsViews.generalStats,

      // FIXME: Eventually add a "/health" endpoint?
    },

    fetch(req: Bun.BunRequest): Response {
      return Response.json({ success: false, errors: ["Not Found"] }, { status: 404 });
    },
  });
}

if (import.meta.main) {
  const server = await makeServer({});
  console.log(`Server running at ${server.url}`);
}
