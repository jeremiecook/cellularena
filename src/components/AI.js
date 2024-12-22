import { DIRECTIONS } from "../constants";
import State from "../models/State";
import IO from "./IO";
import ReachableCells from "./ReachableCells";

export default class AI {
  /**
   * @param {State} state - Current game state
   */
  constructor() {
    this.state = null;
    this.sporersDone = [];
    this.rc = null;
  }

  next(state) {
    const io = new IO();
    this.state = state;
    this.rc = new ReachableCells(state);
    this.reservedCells = new Set();
    this.stock = this.state.getStock(1);

    // Pour chaque organisme (séquence d'organes)
    const organisms = this.state.getOrganisms(1);

    for (let organism of organisms) {
      IO.log("Organism: ", organism);
      const expansionMoves = this.getExpansionMoves(organism);

      if (!expansionMoves.length) {
        io.wait();
        continue;
      }

      // Defense
      const bestDefenseAction = this.getBestDefenseAction(expansionMoves);
      if (bestDefenseAction) {
        const type = this.stock.hasStockFor("TENTACLE") ? "TENTACLE" : "BASIC";
        this.stock.spend(type);
        io.grow(
          type,
          bestDefenseAction.from,
          bestDefenseAction.x,
          bestDefenseAction.y,
          bestDefenseAction.direction
        );
        continue;
      }

      // Root
      const bestRootAction = this.getBestRootAction(organism);
      if (bestRootAction && bestRootAction.score > 0) {
        this.sporersDone.push(bestRootAction.from);
        this.stock.spend("ROOT");
        io.spore(bestRootAction.from, bestRootAction.x, bestRootAction.y);
        continue;
      }

      // Harvester
      if (this.stock.hasStockFor("HARVESTER")) {
        const harvesterMoves = this.getHarvesterMoves(expansionMoves);
        if (harvesterMoves.length) {
          const move = harvesterMoves[0];
          this.stock.spend("HARVESTER");
          io.grow("HARVESTER", move.from, move.x, move.y, move.direction);
          continue;
        }
      }

      // Sporer
      if (this.stock.hasStockFor("SPORER") && !this.organismHasSporer(organism)) {
        const sporerMoves = this.getSporerMoves(expansionMoves);
        const move = sporerMoves[0];
        this.stock.spend("SPORER");
        io.grow("SPORER", move.from, move.x, move.y, move.direction);
        continue;
      }

      // Organe basique
      if (this.stock.hasStockFor("BASIC")) {
        IO.log("BASIC");
        IO.log(this.stock.getStock());
        const basicMoves = this.getBasicMoves(expansionMoves);
        const move = basicMoves[0];
        //if (move.score > 0) {
        this.stock.spend("BASIC");
        io.grow("BASIC", move.from, move.x, move.y, move.direction);
        continue;
        //}
      }

      // Organe de ce qu'on trouve
      const bestType = this.getBestTypeConsideringStock();
      const basicMoves = this.getBasicMoves(expansionMoves);

      const scoredMoves = basicMoves.map((move) => ({
        ...move,
        score: this.rc.simulate(move), // Add the score to each move
      }));

      const orderedMoves = scoredMoves.sort((a, b) => b.score - a.score);
      const move = orderedMoves[0];
      this.stock.spend(bestType);
      io.grow(bestType, move.from, move.x, move.y, move.direction);
    }
  }

  getBestDefenseAction(moves) {
    const ennemyMoves = [];
    for (let move of moves) {
      const ennemies = this.state.getAdjacentEnnemy(move.x, move.y);
      for (let ennemy of ennemies) {
        ennemyMoves.push({ ...move, direction: ennemy.direction });
      }
    }

    return ennemyMoves[0];
  }

  getBestRootAction(organism) {
    if (!this.organismHasSporer(organism)) return false;
    if (!this.stock.hasStockFor("ROOT")) return false;

    const sporers = organism.filter((item) => item.type === "SPORER");
    const targets = [];
    for (let sporer of sporers) {
      if (this.sporersDone.includes(sporer.id)) continue;
      const sporerRange = this.state
        .getSporerRange(sporer)
        .map((move) => ({ ...move, from: sporer.id }));

      targets.push(...sporerRange);
    }

    const scoredMoves = targets.map((move) => ({
      ...move,
      score: this.rc.simulate(move), // Add the score to each move
    }));
    const orderedMoves = scoredMoves.sort((a, b) => b.score - a.score);

    //IO.log("Spore target: ", targets);
    return orderedMoves[0];
  }

  getHarvesterMoves(moves) {
    const harvesterMoves = [];
    for (let move of moves) {
      const isProtein = this.state.isCellProtein(move.x, move.y);
      let score = isProtein ? 1 : 2;
      const closeProteins = this.state.getAdjacentProteins(move.x, move.y);
      for (let protein of closeProteins) {
        harvesterMoves.push({ ...move, direction: protein.direction, type: protein.type, score });
      }
    }
    const orderedMoves = harvesterMoves.sort((a, b) => b.score - a.score);
    //console.error("Ordered: ", orderedMoves);
    return orderedMoves;
  }

  getBasicMoves(moves) {
    const basicMoves = [];
    for (let move of moves) {
      let score = this.rc.simulate(move);
      const isProtein = this.state.isCellProtein(move.x, move.y);
      if (isProtein) score -= 3;
      basicMoves.push({ ...move, score });
    }
    const orderedMoves = basicMoves.sort((a, b) => b.score - a.score);
    //console.error("Ordered: ", orderedMoves);
    return orderedMoves;
  }

  getSporerMoves(moves) {
    const sporerMoves = [];
    for (let move of moves) {
      for (let direction of DIRECTIONS) {
        const score = this.state.getSporerRange({
          x: move.x,
          y: move.y,
          direction: direction[2],
        }).length;
        sporerMoves.push({ ...move, direction: direction[2], score });
      }
    }
    const orderedMoves = sporerMoves.sort((a, b) => b.score - a.score);
    //IO.log("Sporer scores: ", orderedMoves);
    return orderedMoves;
  }

  getExpansionMoves(organism) {
    const moves = [];

    for (const organ of organism) {
      const cells = this.state.getCloseFreeCells(organ.x, organ.y);
      cells.forEach((cell) => moves.push({ from: organ.id, ...cell }));
    }

    return moves;
  }

  getBestTypeConsideringStock() {
    const stock = this.stock.getStock();

    const typeScores = {
      BASIC: stock.a,
      HARVESTER: stock.c + stock.d,
      TENTACLE: stock.b + stock.c,
      SPORER: stock.b + stock.d,
    };

    // Retourne le type avec le score le plus élevé
    return Object.keys(typeScores).reduce((bestType, type) =>
      typeScores[type] > typeScores[bestType] ? type : bestType
    );
  }

  organismHasSporer(organism) {
    return organism.some((item) => item.type === "SPORER");
  }

  reserveCell(x, y) {
    this.reservedCells.add(`${x},${y}`);
  }
}
