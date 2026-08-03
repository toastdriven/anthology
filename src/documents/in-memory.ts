import type { IDocumentStore } from "../interfaces";
import type {
  DocId,
  Document,
} from '../types';

export class InMemoryDocumentStore implements IDocumentStore {
  #data: Map<DocId, Document> = new Map();

  async getDocument(id: DocId): Promise<Document> {
    return await this.#data.get(id);
  }

  async addDocument(document: Document): Promise<void> {
    this.#data.set(document.id, document);
  }

  async deleteDocument(id: DocId): Promise<void> {
    this.#data.delete(id);
  }
}
