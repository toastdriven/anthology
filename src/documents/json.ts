import { DATA_ROOT } from "../constants";
import type { IDocumentStore } from "../interfaces";
import type {
  DocId,
  Document,
  Vector,
} from '../types';
import { ensurePath } from "../utils/fs";

type IndexData = Map<string, Vector[]>;
type SerializedDocumentsData = Record<DocId, Document>;

export class JSONDocumentStore implements IDocumentStore {
  #data: Map<DocId, Document> = new Map();
  storagePath: string;
  #isDirty: boolean = false;

  constructor(storagePath?: string) {
    this.storagePath = storagePath ?? `${DATA_ROOT}/documents`;
  }

  async getDocument(id: DocId): Promise<Document> {
    return await this.#data.get(id);
  }

  async addDocument(document: Document): Promise<boolean> {
    this.#data.set(document.id, document);
    await this.save();
    return true;
  }

  async deleteDocument(id: DocId): Promise<boolean> {
    this.#data.delete(id);
    await this.save();
    return true;
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
    ensurePath(this.storagePath);
    const indexFile = Bun.file(this.makeFilePath());
    if (!(await indexFile.exists())) { return; }
    const rawData: SerializedDocumentsData = await indexFile.json();
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
