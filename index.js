import { ReaderControl } from "./ReaderControl.js";

if (!customElements.get("reader-control")) {
  customElements.define("reader-control", ReaderControl);
}
