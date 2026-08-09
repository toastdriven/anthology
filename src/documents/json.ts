import { DATA_ROOT } from "../constants";
import type { IDocumentStore } from "../interfaces";
import { SerializedDocumentsSchema } from "../schemas";
import type {
  DocId,
  Document,
} from '../types';
import { ensurePath } from "../utils/fs";

type DocumentsData = Map<DocId, Document>;
type SerializedDocumentsData = Record<DocId, Document>;

export class JSONDocumentStore implements IDocumentStore {
  #data: Map<DocId, Document> = new Map();
  storagePath: string;
  #isDirty: boolean = false;

  constructor(storagePath?: string) {
    this.storagePath = storagePath ?? `${DATA_ROOT}/documents`;
  }

  async length() {
    return this.#data.size;
  }

  async getDocument(id: DocId): Promise<Document> {
    const doc = this.#data.get(id);
    if (doc === undefined) {
      throw new Error(`Document '${id}' could not be found`);
    }
    return doc;
  }

  async getDocumentLength(id: DocId): Promise<number> {
    const doc = await this.getDocument(id);
    return doc.content.length;
  }

  async addDocument(document: Document): Promise<boolean> {
    this.#data.set(document.id, document);
    this.#isDirty = true;
    await this.save();
    return true;
  }

  async deleteDocument(id: DocId): Promise<boolean> {
    this.#data.delete(id);
    this.#isDirty = true;
    await this.save();
    return true;
  }

  async clear(): Promise<boolean> {
    this.#data = new Map();
    this.#isDirty = true;
    await this.save();
    return true;
  }

  serialize(): SerializedDocumentsData {
    return Object.fromEntries(this.#data);
  }

  deserialize(raw: SerializedDocumentsData): DocumentsData {
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
    const rawData: SerializedDocumentsData = SerializedDocumentsSchema.parse(await indexFile.json());
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
