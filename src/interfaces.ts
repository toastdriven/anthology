import type {
  DocId,
  Document,
  TermVector,
  Vector,
  WordLocation,
} from './types';

export interface IIndex {
  length(): Promise<number>;
  getTerm(term: string): Promise<Vector[]>;
  addTerm(tv: TermVector): Promise<void>;
  deleteDocument(docId: DocId): Promise<void>;
  clear(): Promise<boolean>;
  load(): Promise<void>;
  save(): Promise<void>;
}

export interface ITokenizer {
  prepare(rawWord: string): string;
  tokenize(document: Document): TermVector[];
}

export interface IDocumentStore {
  length(): Promise<number>;
  getDocument(id: DocId): Promise<Document>;
  getDocumentLength(id: DocId): Promise<number>;
  addDocument(document: Document): Promise<boolean>;
  deleteDocument(id: DocId): Promise<boolean>;
  clear(): Promise<boolean>;
  load(): Promise<void>;
  save(): Promise<void>;
}

export type IResult = {
  id: DocId;
  locations: WordLocation[];
  score: number;
  document?: Document;
  docLength: number;
}

export type IResults = {
  documentStore: IDocumentStore;
  unscored: Map<string, IResult>;
  results: IResult[];
  get length(): number;
  slice(start?: number, end?: number): IResults;
  addTermResults(docVectors: Vector[]): Promise<boolean>;
  scoreResults(scorer: IScorer): Promise<boolean>;
}

export interface IScorer {
  score(result: IResult): Promise<IResult>;
}

export interface IPreprocessorPlugin {
  readonly name: string;
  readonly contentTypes: string[];
  process(document: Document): Promise<Document>;
}

export interface IPostprocessorPlugin {
  readonly name: string;
  process(result: IResult): Promise<IResult>;
}

export interface ISearchEngine {
  setUp(): Promise<void>;
  clear(): Promise<boolean>;
  indexSize(): Promise<number>;
  documentStoreSize(): Promise<number>;
  getDocument(id: DocId): Promise<Document>;
  addDocument(document: Document): Promise<void>;
  deleteDocument(id: DocId): Promise<void>;
  rawSearch(query: string): Promise<IResults>;
  search(query: string): Promise<IResult[]>;
}
