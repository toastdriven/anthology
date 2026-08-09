import type {
  IDocumentStore,
  IResult,
  IResults,
  IScorer,
} from "./interfaces";
import type {
  DocId,
  Document,
  Vector,
  WordLocation,
} from "./types";


/*
The result class is essentially a representation of the document + score.
We want it to be lightweight by itself, since there may be thousands of results,
but rich/comprehensive enough to be useful "at render time".
*/
export class Result implements IResult {
  id: DocId;
  locations: WordLocation[] = [];
  score: number = 0.0;
  document?: Document;
  docLength: number = 0;

  constructor(id: DocId) {
    this.id = id;
  }
}

/*
We want results to act like a collection object (which to me means
iterator/iterable). It needs to be able to do all the slicing, as well as
fetching documents/enriching the individual Result instances that will be handed
to the users.
*/
export class Results implements IResults {
  documentStore: IDocumentStore;
  unscored: Map<string, IResult> = new Map();
  results: Result[] = [];

  constructor(documentStore: IDocumentStore) {
    this.documentStore = documentStore;
  }

  get length(): number {
    return this.results.length;
  }

  *[Symbol.iterator](): IterableIterator<Result> {
    yield* this.results;
  }

  slice(start?: number, end?: number): Results {
    const sliced = new Results(this.documentStore);
    sliced.results = this.results.slice(start, end);
    return sliced;
  }

  async addTermResults(docVectors: Vector[]): Promise<boolean> {
    // FIXME: This is fine for now, but no clue what to do "at scale".
    for (let docVector of docVectors) {
      let result: IResult;
      const wordLocation: WordLocation = {
        originalWord: docVector.originalWord,
        location: docVector.location,
      };

      if (this.unscored.has(docVector.id)) {
        result = this.unscored.get(docVector.id)!;
        result.locations.push(wordLocation);
      }
      else {
        result = new Result(docVector.id);
        result.locations.push(wordLocation);
        result.docLength = await this.documentStore.getDocumentLength(docVector.id);
        this.unscored.set(docVector.id, result);
      }
    }

    return true;
  }

  async scoreResults(scorer: IScorer): Promise<boolean> {
    // FIXME: The computer scientists are going to shame me, because this really
    //     should only be iterated over once & we should be doing an in-place
    //     sort as we score.
    //     But I want to get things working first, then optimize. So it's O(2n)
    //     for now.
    for (let result of this.unscored.values()) {
      await scorer.score(result);
      this.results.push(result);
    }

    // FIXME: We're also being super-wasteful on memory here, with two copies of
    //     each result (one in unscored, one in results). Oof.

    // Sort in descending order, in place.
    this.results.sort((a, b) => b.score - a.score);

    return true;
  }
}
