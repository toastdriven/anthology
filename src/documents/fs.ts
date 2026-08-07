import { DATA_ROOT } from '../constants';
import type { IDocumentStore } from "../interfaces";
import type {
  DocId,
  Document,
} from '../types';

export class FilesystemDocumentStore implements IDocumentStore {
  private readonly dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath ?? DATA_ROOT;
  }

  async getDocument(id: DocId): Promise<Document> {
    const document = this.#data.get(id);
    if (document === undefined) {
      throw new Error(`Document '${id}' could not be found`)
    }
    return document;
  }

  async addDocument(document: Document): Promise<boolean> {
    this.#data.set(document.id, document);
    return true;
  }

  async deleteDocument(id: DocId): Promise<boolean> {
    return this.#data.delete(id);
  }
}
