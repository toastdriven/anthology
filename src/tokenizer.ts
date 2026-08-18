import type {
  ITokenizer,
  ITokenizerPlugin,
} from './interfaces';
import type {
  Document,
  TermVector,
} from './types';

export class Tokenizer implements ITokenizer {
  #plugins: Array<ITokenizerPlugin> = [];

  register(plugin: ITokenizerPlugin): this {
    this.#plugins.push(plugin);
    return this;
  }

  async tokenize(document: Document): Promise<TermVector[]> {
    let termVectors: TermVector[] = [];

    for (let plugin of this.#plugins) {
      const vectors = await plugin.tokenize(document);
      termVectors = termVectors.concat(vectors);
    }

    return termVectors;
  }
}
