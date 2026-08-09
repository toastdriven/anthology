import { DATA_ROOT } from '../constants';
import type { IIndex } from '../interfaces';
import { SerializedIndexSchema } from '../schemas';
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

  async length() {
    return this.#data.size;
  }

  async getTerm(term: string): Promise<Vector[]> {
    const vectors = this.#data.get(term);
    if (vectors === undefined) {
      return [];
    }
    return vectors.slice();
  }

  async addTerm(tv: TermVector): Promise<void> {
    const vectors = await this.getTerm(tv.term);
    const isDupe = vectors.some(v => v.id === tv.vector.id && v.location === tv.vector.location);
    if (!isDupe) {
      vectors.push(tv.vector);
      this.#data.set(tv.term, vectors);
      this.#isDirty = true;
    }
    await this.save();
  }

  async deleteDocument(docId: DocId): Promise<void> {
    for (const [term, vectors] of this.#data) {
      const revised = vectors.filter(v => v.id !== docId);
      if (revised.length !== vectors.length) {
        this.#data.set(term, revised);
        this.#isDirty = true;
      }
    }
    await this.save();
  }

  async clear(): Promise<boolean> {
    this.#data = new Map();
    this.#isDirty = true;
    await this.save();
    return true;
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
    // `.json()` returns `any` — nothing here is trustworthy until validated.
    // `.parse()` throws a descriptive `ZodError` (bad shape, missing fields,
    // wrong types, etc.) right at the boundary, instead of letting corrupt
    // persisted data silently propagate into the rest of the engine.
    const rawData: SerializedIndexData = SerializedIndexSchema.parse(await indexFile.json());
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
