import { CONTENT_TYPE_PLAIN } from "../constants";
import type { IPreprocessorPlugin } from "../interfaces";
import type { Document } from "../types";
import { stripTags } from '../utils/html.ts';

export class HTMLPreprocessor implements IPreprocessorPlugin {
  readonly contentTypes = [
    'text/html',
  ];

  async process(document: Document): Promise<Document> {
    const text = stripTags(document.content);
    return {
      ...document,
      content: text,
      contentType: CONTENT_TYPE_PLAIN,
    };
  }
}
