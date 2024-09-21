import { Speech } from "./Speech.js";

export class Reader {
  #contents;
  #index;
  #speech = new Speech();

  constructor(contents = []) {
    this.#contents = contents;
    this.#index = contents.length ? 0 : -1;
  }

  get reading() {
    return this.#speech.speaking;
  }

  get length() {
    return this.#contents.length;
  }

  get index() {
    return this.#index;
  }

  /**
   * @param {string[]} values
   */
  set contents(values) {
    this.#contents = values;
    this.#index = values.length ? 0 : -1;
  }

  next() {
    const nextIndex = this.#index + 1;
    this.#index = Math.min(this.length - 1, nextIndex);
  }

  prev() {
    const nextIndex = this.#index - 1;
    this.#index = Math.max(nextIndex, 0);
  }

  async readCurrentAsync() {
    const content = this.#contents[this.#index];
    if (!content) {
      console.warn(`No content found at index ${this.#index}`);
    }
    if (this.reading) return;
    await this.#speech.speakAsync(content);
  }
}
