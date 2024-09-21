export class Reader {
  #voice;
  #reading = false;

  constructor() {
    window.speechSynthesis.addEventListener("voiceschanged", () =>
      this.#getVoice()
    );
  }

  get reading() {
    return this.#reading;
  }

  #getVoice() {
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.voiceURI.startsWith("Google UK English Female")) ??
      voices.find((v) => v.lang.startsWith("en"));
    this.#voice = voice;
    console.log("voices", voice);
  }

  #speakAsync(text) {
    return new Promise((resolve, reject) => {
      const utt = new globalThis.SpeechSynthesisUtterance(text);
      utt.voice = this.#voice;
      utt.addEventListener("end", resolve, { once: true });
      utt.addEventListener("error", reject, { once: true });
      globalThis.speechSynthesis.speak(utt);
    });
  }

  async readAsync(text) {
    if (this.#reading) return;

    await this.#speakAsync(text);
  }
}
