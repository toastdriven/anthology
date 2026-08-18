// Types & interfaces (for TypeScript embedders)
export type {
  DocId,
  Document,
  TermVector,
  Token,
  Vector,
  ViewContext,
  WordLocation,
} from "./src/types.ts";
export type {
  IDocumentStore,
  IIndex,
  IPreprocessorPlugin,
  IPostprocessorPlugin,
  IResult,
  IScorer,
  ISearchEngine,
  ITokenizer,
  ITokenizerPlugin,
} from "./src/interfaces.ts";

// Core engine
export { SearchEngine } from "./src/engine.ts";
export { Preprocessor } from "./src/preprocessor.ts";
export { Postprocessor } from "./src/postprocessor.ts";

// Document backends
export { InMemoryDocumentStore } from "./src/documents/in-memory.ts";
export { JSONDocumentStore } from "./src/documents/json.ts";

// Index backends
export { InMemoryIndex } from "./src/indexes/in-memory.ts";
export { JSONIndex } from "./src/indexes/json.ts";

// Preprocessor plugins
export { HTMLPreprocessor } from "./src/preprocessors/html.ts";

// Results
export type {
  Result,
  Results,
} from "./src/results.ts";

// Scoring
export { SimpleScorer } from "./src/scorers/simple.ts";

// HTTP server (opt-in)
export { makeServer } from "./src/server.ts";

// Tokenizers
export { Tokenizer } from "./src/tokenizer.ts";
export {
  type SimpleTokenizerOptions,
  SimpleTokenizer,
} from "./src/tokenizers/simple.ts";
