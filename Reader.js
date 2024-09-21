import { Speech } from "./Speech.js";

export class Reader {
  #contents;
  #index;
  #speech = new Speech();
  #onchange = () => null;

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

  set onchange(cb) {
    if (typeof cb === "function") {
      this.#onchange = cb;
    }
  }

  /**
   * @param {string[]} values
   */
  set contents(values) {
    this.#contents = values;
    this.#index = values.length ? 0 : -1;
  }

  next() {
    this.stop();
    const nextIndex = this.#index + 1;
    this.#index = Math.min(this.length - 1, nextIndex);
    this.#onchange(this.#index);
  }

  prev() {
    this.stop();
    const nextIndex = this.#index - 1;
    this.#index = Math.max(nextIndex, 0);
    this.#onchange(this.#index);
  }

  stop() {
    this.#speech.stop();
  }

  // async readOnAsync() {
  //   while (this.#speech.speaking) {
  //     await this.readCurrentAsync();
  //     if (this.index + 1 < this.length) {
  //       this.next();
  //     } else {
  //       this.stop();
  //     }
  //   }
  // }

  async readCurrentAsync() {
    const content = this.#contents[this.#index];
    if (!content) {
      console.warn(`No content found at index ${this.#index}`);
    }
    if (this.reading) return;
    await this.#speech.speakAsync(content);
  }
}
