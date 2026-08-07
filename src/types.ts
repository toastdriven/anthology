export type DocId = string;

export type Document = {
  id: DocId;
  content: string;
  contentType?: string;
};

export type Vector = {
  id: DocId;
  originalWord: string;
  location: number;
};

export type TermVector = {
  term: string;
  vector: Vector;
};

export type Token = {
  word: string;
  offset: number;
};
