import { QUERY_DOCUMENT } from './constants';
import { InMemoryDocumentStore } from './documents/in-memory';
import { InMemoryIndex } from './indexes/in-memory';
import type {
  IDocumentStore,
  IIndex,
  IScorer,
  ISearchEngine,
  ITokenizer,
} from './interfaces';
import { Postprocessor } from './postprocessor';
import { Preprocessor } from './preprocessor';
import {
  Result,
  Results,
} from './results';
import { SimpleScorer } from './scorers/simple';
import { Tokenizer } from './tokenizer';
import { SimpleTokenizer } from './tokenizers/simple';
import type {
  DocId,
  Document,
} from './types';

export interface ISearchEngineOptions {
  index?: IIndex;
  tokenizer?: ITokenizer;
  preprocessor?: Preprocessor;
  documentStore?: IDocumentStore;
  scorer?: IScorer;
  postprocessor?: Postprocessor;
}

export class SearchEngine implements ISearchEngine {
  private readonly index: IIndex;
  private readonly tokenizer: ITokenizer;
  private readonly preprocessor: Preprocessor;
  private readonly documentStore: IDocumentStore;
  private readonly scorer: IScorer;
  private readonly postprocessor: Postprocessor;

  constructor(options: ISearchEngineOptions) {
    // FIXME: Eventually, this will need saner/persistent defaults.
    this.index = options.index ?? new InMemoryIndex();
    this.tokenizer = options.tokenizer ?? new Tokenizer()
      .register(new SimpleTokenizer());
    this.preprocessor = options.preprocessor ?? new Preprocessor();
    this.documentStore = options.documentStore ?? new InMemoryDocumentStore();
    this.scorer = options.scorer ?? new SimpleScorer();
    this.postprocessor = options.postprocessor ?? new Postprocessor();
  }

  async setUp(): Promise<void> {
    await this.index.load();
    await this.documentStore.load();
  }

  async clear(): Promise<boolean> {
    await this.index.clear();
    await this.documentStore.clear();
    return true;
  }

  async indexSize(): Promise<number> {
    return await this.index.length();
  }

  async documentStoreSize(): Promise<number> {
    return await this.documentStore.length();
  }

  async getDocument(id: DocId): Promise<Document> {
    return await this.documentStore.getDocument(id);
  }

  async addDocument(document: Document): Promise<void> {
    await this.documentStore.addDocument(document);
    const processed = await this.preprocessor.process(document);
    const termVectors = await this.tokenizer.tokenize(processed);
    for (const tv of termVectors) {
      await this.index.addTerm(tv);
    }
    return await this.index.save();
  }

  async deleteDocument(id: DocId): Promise<void> {
    await this.index.deleteDocument(id);
    await this.documentStore.deleteDocument(id);
    return;
  }

  // FIXME: This API needs to change. It should always take a structured query.
  async rawSearch(query: string): Promise<Results> {
    const queryDoc: Document = {
      id: QUERY_DOCUMENT,
      content: query,
    };
    const queryTerms = await this.tokenizer.tokenize(queryDoc);

    const results = new Results(this.documentStore);

    for (const tv of queryTerms) {
      const docVectors = await this.index.getTerm(tv.term);
      await results.addTermResults(docVectors);
    }

    await results.scoreResults(this.scorer);
    return results;
  }

  // FIXME: This is a stub for the basic search & needs much more.
  async search(query: string): Promise<Result[]> {
    const rawResults = await this.rawSearch(query);
    // FIXME: Post-slicing the results, we should be loading the documents for
    //     each (as well as any other post-processing).
    const sliced = rawResults.slice(0, 10);
    const results: Result[] = [];

    for (let res of sliced) {
      results.push(await this.postprocessor.process(res));
    }

    return results;
  }
}
