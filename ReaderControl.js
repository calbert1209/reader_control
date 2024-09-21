import { Reader } from "./Reader.js";

export class ReaderControl extends HTMLElement {
  #dom;
  #readableContents;
  #index = 1;
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
    this.#dom.next.addEventListener("click", () => {
      this.#reader.next();
      console.log(`${this.#reader.index + 1} / ${this.#reader.length}`);
    });
  }

  connectedCallback() {
    this.#updateReadableContents();
  }

  #read() {
    this.#reader.readCurrentAsync();
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
    this.#reader.contents = readable.map((x) => x.text);
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
