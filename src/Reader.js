import { Speech } from "./Speech.js";

export class Reader {
  #contents;
  #index;
  #speech = new Speech();
  #onchange = () => null;
  #reading = false;

  constructor(contents = []) {
    this.#contents = contents;
    this.#index = contents.length ? 0 : -1;
  }

  get reading() {
    return this.#reading;
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

  #_next() {
    const nextIndex = this.#index + 1;
    this.#index = Math.min(this.length - 1, nextIndex);
    this.#onchange(this.#index);
  }

  next() {
    this.stop();
    this.#_next();
  }

  #_prev() {
    const nextIndex = this.#index - 1;
    this.#index = Math.max(nextIndex, 0);
    this.#onchange(this.#index);
  }

  prev() {
    this.stop();
    this.#_prev();
  }

  stop() {
    this.#speech.stop();
    this.#reading = false;
  }

  reset() {
    this.#index = contents.length ? 0 : -1;
    this.#onchange(0);
  }

  async readOnAsync() {
    if (this.#reading) return;

    this.#reading = true;
    while (this.#reading) {
      const currentIndex = this.index;
      await this.readCurrentAsync();
      if (!this.#reading) {
        break;
      }
      this.#_next();
      if (this.index === currentIndex) {
        this.stop();
        this.reset();
      }
    }
  }

  async readCurrentAsync() {
    const content = this.#contents[this.#index];
    if (!content) {
      console.warn(`No content found at index ${this.#index}`);
    }
    if (this.#speech.speaking) return;
    await this.#speech.speakAsync(content);
  }
}
