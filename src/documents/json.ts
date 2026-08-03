import type { IDocumentStore } from "../interfaces";
import type {
  DocId,
  Document,
} from '../types';

type IndexData = Map<string, Vector[]>;
type SerializedDocumentsData = Record<DocId, Document>;

export class JSONDocumentStore implements IDocumentStore {
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

  serialize(): SerializedDocumentsData {
    return Object.fromEntries(this.#data);
  }

  deserialize(raw: SerializedDocumentsData): SerializedDocumentsData {
    return new Map(Object.entries(raw));
  }

  makeFilePath(): string {
    return `${this.storagePath}/index.json`;
  }

  async load(): Promise<void> {
    const indexFile = Bun.file(this.makeFilePath());
    if (!(await indexFile.exists())) { return; }
    const rawData: SerializedDocumentsData = await indexFile.json();
    this.#data = this.deserialize(rawData);
    this.#isDirty = false;
  }

  async save(): Promise<void> {
    if (!this.#isDirty) { return; }
    const indexFile = Bun.file(this.makeFilePath());
    await indexFile.write(JSON.stringify(this.serialize()));
    this.#isDirty = false;
  }
}
