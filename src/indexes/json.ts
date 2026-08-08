import { DATA_ROOT } from '../constants';
import type { IIndex } from '../interfaces';
import type {
  DocId,
  TermVector,
  Vector,
} from '../types';
import { ensurePath } from '../utils/fs';

type IndexData = Map<string, Vector[]>;
type SerializedIndexData = Record<string, Vector[]>;

export class JSONIndex implements IIndex {
  storagePath: string;
  #data: IndexData;
  #isDirty: boolean = false;

  constructor(storagePath?: string) {
    this.storagePath = storagePath ?? `${DATA_ROOT}/indexes`;
    this.#data = new Map();
  }

  getTerm(term: string): Vector[] {
    const vectors = this.#data.get(term);
    if (vectors === undefined) {
      return [];
    }
    return vectors.slice();
  }

  addTerm(tv: TermVector): void {
    const vectors = this.getTerm(tv.term);
    const isDupe = vectors.some(v => v.id === tv.vector.id && v.location === tv.vector.location);
    if (!isDupe) {
      vectors.push(tv.vector);
      this.#data.set(tv.term, vectors);
      this.#isDirty = true;
    }
  }

  deleteDocument(docId: DocId): void {
    for (const [term, vectors] of this.#data) {
      const revised = vectors.filter(v => v.id !== docId);
      if (revised.length !== vectors.length) {
        this.#data.set(term, revised);
        this.#isDirty = true;
      }
    }
  }

  serialize(): SerializedIndexData {
    return Object.fromEntries(this.#data);
  }

  deserialize(raw: SerializedIndexData): IndexData {
    return new Map(Object.entries(raw));
  }

  makeFilePath(): string {
    return `${this.storagePath}/index.json`;
  }

  async load(): Promise<void> {
    ensurePath(this.storagePath);
    const indexFile = Bun.file(this.makeFilePath());
    if (!(await indexFile.exists())) { return; }
    const rawData: SerializedIndexData = await indexFile.json();
    this.#data = this.deserialize(rawData);
    this.#isDirty = false;
  }

  async save(): Promise<void> {
    if (!this.#isDirty) { return; }
    ensurePath(this.storagePath);
    const indexFile = Bun.file(this.makeFilePath());
    await indexFile.write(JSON.stringify(this.serialize()));
    this.#isDirty = false;
  }
}
