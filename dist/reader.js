/** Class that wraps the browsers text-to-speech API */
class Speech {
  #speaking = false;
  #pitch;
  #rate;
  #volume;
  #voice;
  #voices;
  #onVoicesChange;
  #unusedVoices = new Set([
    "Bubbles",
    "Bad News",
    "Bahh",
    "Bells",
    "Boing",
    "Cellos",
    "Good News",
    "Jester",
    "Junior",
    "Organ",
    "Superstar",
    "Trinoids",
    "Whisper",
    "Wobble",
    "Zarvox",
    "ささやき声",
    "オルガン",
    "スーパースター",
    "トリノイド",
    "ベル",
    "道化",
    "震え",
  ]);

  /**
   *
   * @param {number} pitch number in range between 0.1 and 2.0. defaults to 1.8.
   * @param {number} rate  number in range between 0.1 and 2.0. defaults to 1.
   * @param {number} voice number in range between 0.1 and 2.0. defaults to 1.
   */
  constructor({ pitch, rate, volume, onVoicesChange } = {}) {
    this.#pitch = pitch ?? 0.8;
    this.#rate = rate ?? 1;
    this.#volume = volume ?? 1;
    this.#voices = [];
    this.#onVoicesChange = onVoicesChange;
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
   * @typedef {object} SpeechSettings
   * @property {number} rate
   * @property {number} pitch
   * @property {number} volume
   * @property {SpeechSynthesisVoice} voice
   *
   * @returns {SpeechSettings}
   */
  get settings() {
    return {
      rate: this.#rate,
      pitch: this.#pitch,
      volume: this.#volume,
      voice: this.#voice,
    };
  }

  get voices() {
    return this.#voices;
  }

  get voiceURI() {
    return this.#voice?.voiceURI;
  }

  /**
   * @param {string} value URI of voice from list to use
   */
  set voiceURI(value) {
    const nextVoice = this.#voices.find((v) => v.voiceURI === value);
    if (nextVoice) {
      this.#voice = nextVoice;
    } else {
      console.warn(`Could not find URI "${value}"`);
    }
  }

  /**
   *
   * @param {string} text
   * @param {Object} options
   * @param {SpeechSynthesisVoice} options.voice voice to use
   * @param {number} options.pitch pitch of speech from range 0.1 to 2.0
   * @param {number} options.rate rate of speech from range 0.1 to 2.0
   * @param {number} options.volume volume of speech from range 0.1 to 2.0
   * @returns {Promise<void>}
   */
  async speakAsync(text, options) {
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
    const enVoices = voices.filter(
      (v) =>
        v.lang.startsWith("en") &&
        v.localService &&
        !v.voiceURI.toLocaleLowerCase().startsWith("grand") &&
        !this.#unusedVoices.has(v.voiceURI)
    );
    const voice =
      enVoices.find((v) => v.voiceURI.startsWith("Arthur")) ?? enVoices[0];
    this.#voice = voice;
    this.#voices = enVoices;
    this.#onVoicesChange?.(enVoices);
  }

  #speakUtteranceAsync(text, options) {
    if (!this.#voice) {
      this.#getVoice();
    }

    return new Promise((resolve, reject) => {
      const utt = new globalThis.SpeechSynthesisUtterance(text);
      // utt.voice = options?.voice ?? this.#voice;
      utt.voiceURI = options?.voice?.voiceURI ?? this.#voice?.voiceURI;
      utt.lang = options?.voice?.lang ?? this.#voice?.lang ?? "en-US";
      utt.pitch = options?.pitch ?? this.#pitch;
      utt.rate = options?.rate ?? this.#rate;
      utt.volume = options?.volume ?? this.#volume;
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
 * @property {number} depth - blocks depth in the content hierarchy
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
  constructor(onVoicesChange, contents = []) {
    this.#contents = contents;
    this.#index = 0;
    this.#speech = new Speech({
      onVoicesChange: (voices) => onVoicesChange(voices),
    });
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

  get voices() {
    return this.#speech.voices;
  }

  get voiceURI() {
    return this.#speech.voiceURI;
  }

  /**
   * @param {string} value URI of voice from list to use
   */
  set voiceURI(value) {
    this.#speech.voiceURI = value;
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
    this.#index = 0;
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
    this.#index = 0;
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

  async #silence(ms) {
    return new Promise((resolve) => {
      globalThis.setTimeout(resolve, ms);
    });
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

    const { postPause, ...speechOptions } = this.#getProsody(content);
    await this.#silence(postPause);
    await this.#speech.speakAsync(content.text, speechOptions);
    await this.#silence(postPause);
  }

  get #prosodyMap() {
    return {
      h1: { rate: 0.6, pitch: 0.7, volume: 1, postPause: 180 },
      h2: { rate: 0.6, pitch: 0.7, volume: 1, postPause: 150 },
      h3: { rate: 0.7, pitch: 0.8, volume: 1, postPause: 120 },
      h4: { rate: 0.7, pitch: 0.8, volume: 1, postPause: 90 },
      h5: { rate: 0.8, pitch: 0.9, volume: 1, postPause: 60 },
      h6: { rate: 0.8, pitch: 0.9, volume: 1, postPause: 30 },
    };
  }

  /**
   * @param {ContentBlock} block
   */
  #getProsody({ tag }) {
    const { settings } = this.#speech;
    const { rate: sR, pitch: sP, volume: sV } = settings;
    const prosodyDelta = this.#prosodyMap[tag];
    if (!prosodyDelta) {
      return {
        ...settings,
        postPause: 30,
      };
    }

    const { rate: dR, pitch: dP, volume: dV, postPause } = prosodyDelta;
    return {
      rate: sR * dR,
      pitch: sP * dP,
      volume: sV * dV,
      postPause,
    };
  }
}

/** Web component to control text-to-speech reader */
class ReaderControl extends HTMLElement {
  #dom;
  #reader;

  constructor() {
    super();
    this.#reader = new Reader(() => this.#updateVoiceSelect());
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
    this.#updateVoiceSelect();
  }

  #updateDisplay() {
    const text = `${this.#reader.index + 1} / ${this.#reader.length}`;
    this.#dom.display.textContent = text;
  }

  #updateVoiceSelect() {
    const voices = this.#reader.voices;
    const voiceURI = this.#reader.voiceURI;
    const selectEl = this.#createVoiceSelect(voices ?? [], voiceURI);
    this.#dom.select.replaceWith(selectEl);
    this.#dom.select = selectEl;
  }

  #getTagDepth(tag) {
    if (!/^h/.test(tag)) {
      return 0;
    }

    const level = parseInt(tag[1], 10);

    return isNaN(level) ? 0 : level;
  }

  #updateReadableContents() {
    const contents = document.querySelectorAll(".readable > *");
    const readable = [...contents].map((el) => {
      const text = el.textContent
        .replace(/\n/gi, "")
        .replace(/\s{2,}/gi, " ")
        .trim();
      const tag = el.tagName.toLowerCase();
      const depth = this.#getTagDepth(tag);
      return { text, tag, depth };
    });

    this.#reader.contents = readable;
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

    const display = document.createElement("div");
    display.classList.add("display");
    display.textContent = "0 / 0";
    dom["display"] = display;
    div.insertBefore(display, dom.refresh);
    root.appendChild(div);

    const styleEl = this.#createStyle(style);
    root.appendChild(styleEl);

    const selectEl = this.#createVoiceSelect([]);
    root.appendChild(selectEl);
    dom["select"] = selectEl;
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

  #onChangeVoice(e) {
    this.#reader.stop();
    this.#reader.voiceURI = e.target.value;
  }

  #createVoiceSelect(voices, voiceURI) {
    const selectEl = document.createElement("select");
    selectEl.addEventListener("change", (e) => this.#onChangeVoice(e));
    const index = voices.findIndex((v) => v.voiceURI === voiceURI);
    if (index < 0) return selectEl;

    for (const voice of voices) {
      const optionEl = document.createElement("option");
      optionEl.value = voice.voiceURI;
      const [cleanName] = voice.name.split("(");
      optionEl.innerText = `${cleanName} (${voice.lang})`;
      optionEl.selected = voice.voiceURI === voiceURI;
      selectEl.appendChild(optionEl);
    }
    return selectEl;
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
