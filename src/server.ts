import { VERSION } from './constants';
import { SearchEngine } from './engine';
import { InMemoryIndex } from './indexes/in-memory';
import { SimpleTokenizer } from './tokenizers/simple';

const engine = new SearchEngine(
  new InMemoryIndex(),
  new SimpleEnglishTokenizer(),
);

export const server = Bun.serve({
  hostname: "0.0.0.0",
  port: 8080,

  routes: {
    "/documents/:id": {
      GET: async (req) => {
        engine.getDocument();
        return Response.json({});
      },
      POST: async (req) => {
        engine.addDocument();
        return Response.json({});
      },
      PUT: async (req) => {
        engine.addDocument();
        return Response.json({});
      },
      DELETE: async (req) => {
        engine.deleteDocument();
        return Response.json({});
      },
    },

    "/search/basic": async (req) => {
      const results = engine.search(req.params['q']);
      return Response.json({ results: results });
    },
    // "/search/autocomplete": async (req) => {
    //   const results = engine.search(req.params['q']);
    //   return Response.json({ results: results });
    // },
    // "/search/more-like-this/:id": async (req) => {
    //   const results = engine.search(req.params['q']);
    //   return Response.json({ results: results });
    // },

    "/stats": async (req) => {
      return Response.json({
        version: VERSION,

      })
    }

    "/favicon.ico": Bun.file("./favicon.ico"),
  },

  fetch(req) {
    return Response.json({ success: false, errors: ["Not Found"] }, { status: 404 });
  },
});

console.log(`Server running at ${server.url}...`);
