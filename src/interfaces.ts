import type {
  DocId,
  Document,
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
  addDocument(document: Document): Promise<boolean>;
  deleteDocument(id: DocId): Promise<boolean>;
}

export type IResult = {
  id: DocId;
  locations: Vector[];
  score: number;
  document?: Document;
  docLength?: number;
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
