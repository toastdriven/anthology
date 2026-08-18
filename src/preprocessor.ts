import { CONTENT_TYPE_PLAIN } from './constants';
import type { IPreprocessorPlugin } from './interfaces';
import type { Document } from './types';

export class Preprocessor {
  #plugins: Map<string, IPreprocessorPlugin> = new Map();

  register(plugin: IPreprocessorPlugin): this {
    for (const ct of plugin.contentTypes) {
      this.#plugins.set(ct, plugin);
    }

    return this;
  }

  async process(document: Document): Promise<Document> {
    const plugin = this.#plugins.get(document.contentType ?? CONTENT_TYPE_PLAIN);

    if (!plugin) {
      return document;
    }

    return plugin.process(document);
  }
}
