import {
  PUNCTUATION,
  ENGLISH_STOP_WORDS,
} from "../constants";
import type { ITokenizerPlugin } from "../interfaces";
import type {
  Document,
  TermVector,
} from '../types';

export type SimpleTokenizerOptions = {
  suffixRegex?: RegExp;
  stopWords?: Set<string>;
};

export class SimpleTokenizer implements ITokenizerPlugin {
  private suffixRegex: RegExp;
  private stopWords: Set<string>;

  constructor(options: SimpleTokenizerOptions = {}) {
    this.suffixRegex = options.suffixRegex ?? /(es|ed|ing|s|able)$/;
    this.stopWords = options.stopWords ?? new Set(ENGLISH_STOP_WORDS);
  }

  prepare(rawWord: string): string {
    return rawWord
      .trim()
      .toLocaleLowerCase()
      .replace(PUNCTUATION, "")
      .replace(this.suffixRegex, "");
  }

  async tokenize(document: Document): Promise<TermVector[]> {
    const sep = /\S+/g;
    const tokens = [...document.content.matchAll(sep)].map(match => {
      return {
        word: match[0],
        offset: match.index,
      };
    });

    const termVectors: TermVector[] = tokens.map((token) => {
      const cleanWord = this.prepare(token.word);
      if (this.stopWords.has(cleanWord)) {
        return null;
      }
      return {
        term: cleanWord,
        vector: {
          id: document.id,
          originalWord: token.word,
          location: token.offset,
        },
      };
    }).filter((res): res is TermVector => res !== null);

    return termVectors;
  }
}
