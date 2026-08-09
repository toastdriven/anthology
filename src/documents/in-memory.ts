import type { IDocumentStore } from "../interfaces";
import type {
  DocId,
  Document,
} from '../types';

export class InMemoryDocumentStore implements IDocumentStore {
  #data: Map<DocId, Document> = new Map();

  async length() {
    return this.#data.size;
  }

  async getDocument(id: DocId): Promise<Document> {
    const document = this.#data.get(id);
    if (document === undefined) {
      throw new Error(`Document '${id}' could not be found`)
    }
    return document;
  }

  async getDocumentLength(id: DocId): Promise<number> {
    const doc = await this.getDocument(id);
    return doc.content.length;
  }

  async addDocument(document: Document): Promise<boolean> {
    this.#data.set(document.id, document);
    return true;
  }

  async deleteDocument(id: DocId): Promise<boolean> {
    return this.#data.delete(id);
  }

  async clear(): Promise<boolean> {
    this.#data = new Map();
    return true;
  }

  async load(): Promise<void> {
    // No-op;
  }

  async save(): Promise<void> {
    // No-op;
  }
}
