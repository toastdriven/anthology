import type {
  IDocumentStore,
  IResult,
  IScorer,
} from "./interfaces";
import type {
  DocId,
  Document,
  Vector,
} from "./types";


/*
The result class is essentially a representation of the document + score.
We want it to be lightweight by itself, since there may be thousands of results,
but rich/comprehensive enough to be useful "at render time".
*/
export class Result implements IResult {
  id: DocId;
  // FIXME: If it weren't for the mass duplications of document ids, we'd actually
  //     just want a collection of the matching TermVectors here. Do we need/want
  //     a different structure here? Do we care about the duplication (probably,
  //     especially with big IDs)...?
  locations: Vector[] = [];
  score: number = 0.0;
  document?: Document;
  docLength?: number = 0;

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
export class Results {
  documentStore: IDocumentStore;
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
    // FIXME: This isn't right. This will totally create duplicate documents in
    //     the result set. We need either a `Set` or a `Map` for the short-term,
    //     and no clue what to do "at scale".
    for (let docVector of docVectors) {
      const result = new Result(docVector.id);
      // FIXME: This needs more, like the vectors getting set on the results,
      //     fetching the document length (for scoring purposes), etc.
      this.results.push(result);
    }
    return true;
  }

  async scoreResults(scorer: IScorer): Promise<boolean> {
    // FIXME: The computer scientists are going to shame me, because this really
    //     should only be iterated over once & we should be doing an in-place
    //     sort as we score.
    //     But I want to get things working first, then optimize. So it's O(2n)
    //     for now.
    for (let result of this.results) {
      await scorer.score(result);
    }

    // Sort in descending order, in place.
    this.results.sort((a, b) => b.score - a.score);

    return true;
  }
}
