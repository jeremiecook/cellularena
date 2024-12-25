import IO from "./IO";

export default class Timer {
  constructor() {
    this.startTime = Date.now();
  }

  // Méthode pour démarrer le compteur
  start() {
    this.startTime = Date.now();
    IO.log("Timer started.");
  }

  // Méthode pour arrêter le compteur
  stop() {
    if (this.timerId === null) {
      IO.log("Timer is not running.");
      return;
    }

    clearInterval(this.timerId);
    this.timerId = null;

    const totalElapsed = Date.now() - this.startTime;
    IO.log(`Timer stopped. Temps total écoulé : ${totalElapsed} ms`);
  }

  top(message = "") {
    const elapsed = Date.now() - this.startTime;
    IO.log(message, `Temps écoulé : ${elapsed} ms`);
  }

  // Méthode pour réinitialiser le compteur
  reset() {
    if (this.timerId !== null) {
      this.stop();
    }
    this.startTime = null;
    IO.log("Timer reset.");
  }
}
