/** Class that wraps the browsers text-to-speech API */
class Speech {
  #speaking = false;
  #pitch;
  #rate;
  #voice;

  /**
   *
   * @param {number} pitch number in range between 0.1 and 2.0. defaults to 1.8.
   * @param {number} rate  number in range between 0.1 and 2.0. defaults to 1.
   */
  constructor(pitch = 0.8, rate = 1) {
    this.#pitch = pitch;
    this.#rate = rate;
    globalThis.speechSynthesis.addEventListener("voiceschanged", () =>
      this.#getVoice()
    );
  }

  /**
   * Flag raised while speaking
   * @returns {boolean}
   */
  get speaking() {
    this.#speaking;
  }

  /**
   *
   * @param {string} text
   * @param {Object} options
   * @param {SpeechSynthesisVoice} options.voice voice to use
   * @param {number} options.pitch pitch of speech from range 0.1 to 2.0
   * @param {number} options.rate rate of speech from range 0.1 to 2.0
   * @returns
   */
  async speakAsync(
    text,
    options = { voice: this.#voice, pitch: this.#pitch, rate: this.#rate }
  ) {
    if (this.#speaking) return;

    this.#speaking = true;
    try {
      await this.#speakUtteranceAsync(text, options);
    } finally {
      this.#speaking = false;
    }
  }

  /**
   * Stop the reader while reading the current block of content
   */
  stop() {
    globalThis.speechSynthesis.cancel();
  }

  #getVoice() {
    const voices = globalThis.speechSynthesis.getVoices();
    const enVoices = voices.filter((v) => v.lang.startsWith("en"));
    const voice =
      enVoices.find((v) => v.voiceURI.startsWith("Arthur")) ?? enVoices[0];
    this.#voice = voice;
  }

  #speakUtteranceAsync(
    text,
    options = { voice: this.#voice, pitch: this.#pitch, rate: this.#rate }
  ) {
    if (!this.#voice) {
      this.#getVoice();
    }

    return new Promise((resolve, reject) => {
      const utt = new globalThis.SpeechSynthesisUtterance(text);
      utt.voice = options.voice;
      utt.pitch = options.pitch;
      utt.rate = options.rate;
      utt.addEventListener("end", resolve, { once: true });
      utt.addEventListener(
        "error",
        (e) => {
          if ((e.type === "error") & (e.error === "interrupted")) {
            resolve();
          } else {
            reject();
          }
        },
        { once: true }
      );
      globalThis.speechSynthesis.speak(utt);
    });
  }
}

/**
 * @typedef {object} ContentBlock - represents a block of content to be read
 * @property {string} text - the text to be read
 * @property {string} tag - the HTML tag that holds the text to be read
 */

class Reader {
  /** @type {ContentBlock[]} */
  #contents;
  #index;
  #speech = new Speech();
  #onchange = () => null;
  #reading = false;

  /**
   * @constructor
   * @param {ContentBlock[]} contents
   */
  constructor(contents = []) {
    this.#contents = contents;
    this.#index = contents.length;
  }

  /**
   * State of reader
   * @returns {boolean}
   */
  get reading() {
    return this.#reading;
  }

  /**
   * Length of content.
   * @returns {number}
   */
  get length() {
    return this.#contents.length;
  }

  /**
   * @returns {number} index of current content block
   */
  get index() {
    return this.#index;
  }

  /**
   * @param {(newIndex: number) => void} cb
   */
  set onchange(cb) {
    if (typeof cb === "function") {
      this.#onchange = cb;
    }
  }

  /**
   * @param {ContentBlock[]} values
   */
  set contents(values) {
    this.#contents = values;
    this.#index = values.length;
  }

  #_next() {
    const nextIndex = this.#index + 1;
    this.#index = Math.min(this.length - 1, nextIndex);
    this.#onchange(this.#index);
  }

  /**
   * Stop if playing, then increment index
   */
  next() {
    this.stop();
    this.#_next();
  }

  #_prev() {
    const nextIndex = this.#index - 1;
    this.#index = Math.max(nextIndex, 0);
    this.#onchange(this.#index);
  }

  /**
   * Stop if playing, then decrement index
   */
  prev() {
    this.stop();
    this.#_prev();
  }

  /**
   * Stop the reader while reading
   */
  stop() {
    this.#speech.stop();
    this.#reading = false;
  }

  /**
   * Reset the index to 0
   */
  reset() {
    this.#index = contents.length;
    this.#onchange(0);
  }

  /**
   * Read through each block of content in sequence
   * @returns {Promise<void>}
   */
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

  /**
   * Read the content block at the current index
   * @returns {Promise<void>}
   */
  async readCurrentAsync() {
    const content = this.#contents[this.#index];
    if (!content) {
      console.warn(`No content found at index ${this.#index}`);
    }
    if (this.#speech.speaking) return;
    await this.#speech.speakAsync(content);
  }
}

/** Web component to control text-to-speech reader */
class ReaderControl extends HTMLElement {
  #dom;
  #reader;

  constructor() {
    super();
    this.#reader = new Reader();
    this.#reader.onchange = () => this.#updateDisplay();
    const root = this.attachShadow({ mode: "open" });
    this.#renderChildren(root);

    this.#dom.play.addEventListener("click", () => this.#reader.readOnAsync());
    this.#dom.next.addEventListener("click", () => this.#reader.next());
    this.#dom.prev.addEventListener("click", () => this.#reader.prev());
    this.#dom.stop.addEventListener("click", () => this.#reader.stop());
  }

  connectedCallback() {
    this.#updateReadableContents();
    this.#updateDisplay();
  }

  #updateDisplay() {
    const text = `${this.#reader.index + 1} / ${this.#reader.length}`;
    this.#dom.display.textContent = text;
  }

  #updateReadableContents() {
    const contents = document.querySelectorAll(".readable > *");
    const readable = [...contents].map((el) => {
      const text = el.textContent
        .replace(/\n/gi, "")
        .replace(/\s{2,}/gi, " ")
        .trim();
      return { text, tag: el.tagName.toLowerCase() };
    });

    this.#reader.contents = readable.map((x) => x.text);
  }

  #renderChildren(root) {
    const div = document.createElement("div");
    div.classList.add("controlContainer");
    const buttons = [
      { icon: Icons.prev, name: "prev" },
      { icon: Icons.stop, name: "stop" },
      { icon: Icons.play, name: "play" },
      { icon: Icons.next, name: "next" },
    ];

    const dom = {};
    for (const { icon, name } of buttons) {
      const btnEl = this.#createButton({ icon, name });
      div.appendChild(btnEl);
      dom[name] = btnEl;
    }

    root.appendChild(div);
    const styleEl = this.#createStyle(style);
    root.appendChild(styleEl);
    const display = document.createElement("div");
    display.classList.add("display");
    display.textContent = "0 / 0";
    div.insertBefore(display, dom.refresh);
    dom["display"] = display;
    this.#dom = dom;
  }

  #createButton({ icon, name }) {
    const btn = document.createElement("button");
    btn.classList.add("controlButton");
    btn.id = `${name}-btn`;
    btn.innerHTML = icon;
    return btn;
  }

  #createStyle(css) {
    const el = document.createElement("style");
    el.textContent = css;
    return el;
  }
}

const Icons = {
  prev: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M220-280v-400q0-17 11.5-28.5T260-720q17 0 28.5 11.5T300-680v400q0 17-11.5 28.5T260-240q-17 0-28.5-11.5T220-280Zm458-1L430-447q-9-6-13.5-14.5T412-480q0-10 4.5-18.5T430-513l248-166q5-4 11-5t11-1q16 0 28 11t12 29v330q0 18-12 29t-28 11q-5 0-11-1t-11-5Zm-18-199Zm0 90v-180l-136 90 136 90Z"/></svg>`,
  stop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M240-320v-320q0-33 23.5-56.5T320-720h320q33 0 56.5 23.5T720-640v320q0 33-23.5 56.5T640-240H320q-33 0-56.5-23.5T240-320Zm80 0h320v-320H320v320Zm160-160Z"/></svg>`,
  play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M320-273v-414q0-17 12-28.5t28-11.5q5 0 10.5 1.5T381-721l326 207q9 6 13.5 15t4.5 19q0 10-4.5 19T707-446L381-239q-5 3-10.5 4.5T360-233q-16 0-28-11.5T320-273Zm80-207Zm0 134 210-134-210-134v268Z"/></svg>`,
  next: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M660-280v-400q0-17 11.5-28.5T700-720q17 0 28.5 11.5T740-680v400q0 17-11.5 28.5T700-240q-17 0-28.5-11.5T660-280Zm-440-35v-330q0-18 12-29t28-11q5 0 11 1t11 5l248 166q9 6 13.5 14.5T548-480q0 10-4.5 18.5T530-447L282-281q-5 4-11 5t-11 1q-16 0-28-11t-12-29Zm80-165Zm0 90 136-90-136-90v180Z"/></svg>`,
};

const style = `
  .controlContainer {
    display: flex;
    gap: 4px;
  }
  .controlButton {
    height: 48px;
    width: 48px;
    color: #5f6368;
    border: 1px solid #5f6368;
    border-radius: 4px;
  }

  .controlButton:hover {
    background-color: rgba(0,0,0,0.15);
  }

  .controlButton:active {
    background-color: rgba(0,0,0,0.3);
    color: rgba(0,0,0,0.8)
  }

  .controlButton svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
    transform: translateY(1px);
  }
  
  .display {
    display: flex;
    justify-content: center;
    align-items: center;
    /*background-color: #554f55;*/
    background-color: #5f6368;
    color: white;
    font-family: monospace;
    font-size: 10px;
    width: 48px;
    height: 48px;
    border-radius: 4px;
  }
`;

if (!customElements.get("reader-control")) {
  customElements.define("reader-control", ReaderControl);
}
