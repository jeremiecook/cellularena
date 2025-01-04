import Logger from "./Logger";

export default class Timer {
  constructor() {
    this.startTime = Date.now();
  }

  // Méthode pour démarrer le compteur
  start() {
    this.startTime = Date.now();
    Logger.log("Timer started.");
  }

  // Méthode pour arrêter le compteur
  stop() {
    if (this.timerId === null) {
      Logger.log("Timer is not running.");
      return;
    }

    clearInterval(this.timerId);
    this.timerId = null;

    const totalElapsed = Date.now() - this.startTime;
    Logger.log(`Timer stopped. Temps total écoulé : ${totalElapsed} ms`);
  }

  top(message = "") {
    const elapsed = Date.now() - this.startTime;
    Logger.log(`- Temps écoulé : ${elapsed} ms`, message);
  }

  // Méthode pour réinitialiser le compteur
  reset() {
    if (this.timerId !== null) {
      this.stop();
    }
    this.startTime = null;
    Logger.log("Timer reset.");
  }
}
