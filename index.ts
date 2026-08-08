// Types & interfaces (for TypeScript embedders)
export type { Document, DocId, Vector, TermVector } from "./src/types.ts";
export type { IIndex, ITokenizer, IPreprocessorPlugin, IDocumentStore, IScorer } from "./src/interfaces.ts";
export type { ViewContext } from "./src/context.ts";

// Core engine
export { SearchEngine } from "./src/engine.ts";
export { Preprocessor } from "./src/preprocessor.ts";
export { Postprocessor } from "./src/postprocessor.ts";

// Document backends
// export { FilesystemDocumentStore } from "./src/documents/fs.ts";
export { InMemoryDocumentStore } from "./src/documents/in-memory.ts";
export { JSONDocumentStore } from "./src/documents/json.ts";

// Index backends
export { InMemoryIndex } from "./src/indexes/in-memory.ts";
export { JSONIndex } from "./src/indexes/json.ts";

// Preprocessor plugins
export { HTMLPreprocessor } from "./src/preprocessors/html.ts";

// Results
export type { Result, Results } from "./src/results.ts";

// Scoring
export { SimpleScorer } from "./src/scorers/simple.ts";

// HTTP server (opt-in)
export { makeServer } from "./src/server.ts";

// Tokenizers
export { SimpleTokenizer } from "./src/tokenizers/simple.ts";
