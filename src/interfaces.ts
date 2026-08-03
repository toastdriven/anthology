import type {
  DocId,
  Document,
  Result,
  TermVector,
  Vector,
} from './types';

export interface IIndex {
  getTerm(term: string): Vector[];
  addTerm(tv: TermVector): void;
  deleteDocument(docId: DocId): void;
  load(): Promise<void>;
  save(): Promise<void>;
}

export interface ITokenizer {
  prepare(rawWord: string): string;
  tokenize(document: Document): TermVector[];
}

export interface IDocumentStore {
  getDocument(id: DocId): Promise<Document>;
  addDocument(document: Document): Promise<void>;
  deleteDocument(id: DocId): Promise<void>;
}

export interface IScorer {
  score(result: Result): Result;
}

export interface IPreprocessorPlugin {
  readonly contentTypes: string[];
  process(document: Document): Promise<Document>;
}
