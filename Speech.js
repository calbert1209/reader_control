export class Speech {
  #speaking = false;
  #pitch;
  #voice;

  constructor(pitch = 0.8) {
    this.#pitch = pitch;
    window.speechSynthesis.addEventListener("voiceschanged", () =>
      this.#getVoice()
    );
  }

  get speaking() {
    this.#speaking;
  }

  async speakAsync(text) {
    if (this.#speaking) return;

    this.#speaking = true;
    try {
      await this.#speakUtteranceAsync(text);
    } finally {
      this.#speaking = false;
    }
  }

  stop() {
    window.speechSynthesis.cancel();
  }

  #getVoice() {
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter((v) => v.lang.startsWith("en"));
    const voice =
      enVoices.find((v) => v.voiceURI.startsWith("Arthur")) ?? enVoices[0];
    this.#voice = voice;
  }

  #speakUtteranceAsync(text) {
    if (!this.#voice) {
      this.#getVoice();
    }

    return new Promise((resolve, reject) => {
      const utt = new globalThis.SpeechSynthesisUtterance(text);
      utt.voice = this.#voice;
      utt.pitch = this.#pitch;
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
