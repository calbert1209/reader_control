import { Reader } from "./Reader.js";
import * as Icons from "./Icons.js";

export class ReaderControl extends HTMLElement {
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
    console.log("readable contents", readable);

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
