import type {
  IPostprocessorPlugin,
  IResult,
} from './interfaces';

export class Postprocessor {
  #plugins: Array<IPostprocessorPlugin> = [];

  register(plugin: IPostprocessorPlugin): this {
    this.#plugins.push(plugin);
    return this;
  }

  async process(result: IResult): Promise<IResult> {
    let revised: IResult = structuredClone(result);

    for (let plugin of this.#plugins) {
      revised = await plugin.process(revised);
    }

    return revised;
  }
}
