import type {
  IResult,
  IScorer,
} from "../interfaces";

export class SimpleScorer implements IScorer {
  /*
 The simple scorer simply checks how much of the document original document is
 taken up by the term (actually the original word).
 */
  async score(result: IResult): Promise<IResult> {
    let totalTermLength = 0;
    result.score = 0.0;

    for (let wordLoc of result.locations) {
      totalTermLength += wordLoc.originalWord.length;
    }

    if (result.docLength > 0) {
      // This is essentially just computing what percentage of the document the
      // terms take up (basic popularity).
      result.score = totalTermLength / result.docLength;
    }

    return result;
  }
}
