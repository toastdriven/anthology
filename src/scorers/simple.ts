import type { IScorer } from "../interfaces";
import type {
  DocId,
  Result,
} from '../types';

export class SimpleScorer implements IScorer {
  score(result: Result): Result {
    return result;
  }
}
