// Core engine
export { SearchEngine } from "./src/engine.ts";
export { Preprocessor } from "./src/preprocessor.ts";

// Index backends
export { InMemoryIndex } from "./src/indexes/in-memory.ts";
export { JSONIndex } from "./src/indexes/json.ts";

// Tokenizers
export { SimpleTokenizer } from "./src/tokenizers/simple.ts";

// Preprocessor plugins
export { HTMLPreprocessor } from "./src/preprocessors/html.ts";

// HTTP server (opt-in)
export { makeServer } from "./src/server.ts";

// Types & interfaces (for TypeScript embedders)
export type { Document, DocId, Vector, TermVector, Result } from "./src/types.ts";
export type { IIndex, ITokenizer, IPreprocessorPlugin, IDocumentStore, IScorer } from "./src/interfaces.ts";
export type { ViewContext } from "./src/context.ts";
