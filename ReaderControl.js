class Reader {
  #voice;

  constructor() {
    window.speechSynthesis.addEventListener("voiceschanged", () =>
      this.#getVoice()
    );
  }

  #getVoice() {
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.voiceURI.startsWith("Google UK English Female")) ??
      voices.find((v) => v.lang.startsWith("en"));
    this.#voice = voice;
    console.log("voices", voice);
  }

  speakAsync(text) {
    return new Promise((resolve, reject) => {
      const utt = new globalThis.SpeechSynthesisUtterance(text);
      utt.voice = this.#voice;
      utt.addEventListener("end", resolve, { once: true });
      utt.addEventListener("error", reject, { once: true });
      globalThis.speechSynthesis.speak(utt);
    });
  }
}

export class ReaderControl extends HTMLElement {
  #dom;
  #readableContents;
  #index = 1;
  #reading = false;
  #reader;

  constructor() {
    super();
    this.#reader = new Reader();
    const root = this.attachShadow({ mode: "open" });
    this.#renderChildren(root);
    this.#dom.refresh.addEventListener("click", () =>
      this.#updateReadableContents()
    );

    this.#dom.play.addEventListener("click", () => this.#read());
  }

  connectedCallback() {
    this.#updateReadableContents();
  }

  async #read() {
    if (this.#reading) {
      return;
    }

    this.#reading = true;
    const content = this.#readableContents[this.#index];
    console.log("will read", content.text);
    await this.#reader.speakAsync(content.text);
    this.#reading = false;
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
    console.log("readable contents", readable);

    this.#readableContents = readable;
  }

  #renderChildren(root) {
    const div = document.createElement("div");
    div.classList.add("controlContainer");
    const buttons = [
      { icon: "<<", name: "prev" },
      { icon: "||", name: "pause" },
      { icon: "|>", name: "play" },
      { icon: ">>", name: "next" },
      { icon: "🔎", name: "refresh" },
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
    this.#dom = dom;
  }

  #createButton({ icon, name }) {
    const btn = document.createElement("button");
    btn.classList.add("controlButton");
    btn.id = `${name}-btn`;
    btn.textContent = icon;
    return btn;
  }

  #createStyle(css) {
    const el = document.createElement("style");
    el.textContent = css;
    return el;
  }
}

const style = `
  .controlButton {
    height: 48px;
    width: 48px;
  }
`;
