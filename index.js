console.log("hello from JS!");

class Slider extends HTMLElement {
  connectedCallback() {
    console.log("wcia-slider created");
    this.innerHTML = '<div class="bg-overlay"></div><div class="thumb"></div>';
  }
}

if (!customElements.get("wcia-slider")) {
  customElements.define("wcia-slider", Slider);
}
