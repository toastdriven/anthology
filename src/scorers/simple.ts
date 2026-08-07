import type {
  IResult,
  IScorer,
} from "../interfaces";

export class SimpleScorer implements IScorer {
  async score(result: IResult): Promise<IResult> {
    let totalTermLength = 0;

    for (let vector of result.locations) {
      totalTermLength += vector.originalWord.length;
    }

    result.score = totalTermLength / result.docLength;
    return result;
  }
}
