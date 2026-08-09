import type { IIndex } from '../interfaces';
import type {
  DocId,
  TermVector,
  Vector,
} from '../types';

export class InMemoryIndex implements IIndex {
  #data: Map<string, Vector[]> = new Map();

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
    }
  }

  async deleteDocument(docId: DocId): Promise<void> {
    for (const [term, vectors] of this.#data) {
      const revised = vectors.filter(v => v.id !== docId);
      if (revised.length !== vectors.length) {
        this.#data.set(term, revised);
      }
    }
  }

  async clear(): Promise<boolean> {
    this.#data = new Map();
    return true;
  }

  async load(): Promise<void> {
    // No-op.
  }

  async save(): Promise<void> {
    // No-op.
  }
}
