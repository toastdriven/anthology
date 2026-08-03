import { QUERY_DOCUMENT } from './constants';
import type {
  IIndex,
  ITokenizer,
} from './interfaces';
import { Preprocessor } from './preprocessor';
import type {
  DocId,
  Document,
} from './types';

export class SearchEngine {
  constructor(
    private readonly index: IIndex,
    private readonly tokenizer: ITokenizer,
    private readonly preprocessor: Preprocessor = new Preprocessor(),
  ) {
    this.index = index;
    this.tokenizer = tokenizer;
  }

  async setUp(): Promise<void> {
    return await this.index.load();
  }

  async addDocument(document: Document): Promise<void> {
    const processed = await this.preprocessor.process(document);
    const termVectors = this.tokenizer.tokenize(processed);
    termVectors.forEach((tv) => {
      this.index.addTerm(tv);
    });
    return await this.index.save();
  }

  search(query: string): DocId[] {
    const queryDoc: Document = {
      id: QUERY_DOCUMENT,
      content: query,
    };
    const queryTerms = this.tokenizer.tokenize(queryDoc);

    const rawResults = new Map<DocId, number>();

    queryTerms.forEach((tv) => {
      const docVectors = this.index.getTerm(tv.term);
      // For now, scoring is straight popularity (most times seen).
      docVectors.forEach((vector) => {
        let count = rawResults.get(vector.id);
        if (count === undefined) {
          count = 0;
        }
        rawResults.set(vector.id, count + 1);
      })
    });

    const matches = [...rawResults.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([key]) => key);

    return matches;
  }
}
