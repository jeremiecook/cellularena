import { DIRECTIONS } from "../constants";
import State from "../models/State";
import IO from "../utilities/IO";
import Timer from "../utilities/Timer";
import BFS from "./BFS";

export default class AI {
  /**
   * @param {State} state - Current game state
   */
  constructor() {
    this.state = null;
    this.sporersDone = [];
    this.bfs = null;
  }

  /**
   * Find next move
   * @param {State} state - Current game state
   */
  next(state) {
    this.timer = new Timer();
    this.state = state;
    const io = new IO();

    this.bfs = new BFS(state);
    this.state.calculateDescendance();

    this.reservedCells = new Set();
    this.stock = this.state.getStock(1);

    // Pour chaque organisme (séquence d'organes)
    const organisms = this.state.getOrganisms(1);

    for (let [index, organism] of organisms.entries()) {
      IO.log("Organism: ", index);
      const expansionMoves = this.getExpansionMoves(organism);

      // Pas de coup disponible
      if (!expansionMoves.length) {
        io.wait();
        continue;
      }

      // Defense
      const defend = this.getBestDefenseAction(expansionMoves);
      if (defend) {
        this.stock.spend(defend.type);
        io.grow(defend.type, defend.from, defend.x, defend.y, defend.direction);
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
      const harvest = this.getBestHarvesterAction(expansionMoves);
      if (harvest) {
        this.stock.spend("HARVESTER");
        io.grow("HARVESTER", harvest.from, harvest.x, harvest.y, harvest.direction);
        continue;
      }

      // Sporer
      if (this.stock.hasStockFor("SPORER") && !this.organismHasSporer(organism)) {
        const sporerMoves = this.getSporerMoves(expansionMoves);
        const move = sporerMoves[0];
        this.stock.spend("SPORER");
        io.grow("SPORER", move.from, move.x, move.y, move.direction);
        continue;
      }

      // Expand
      const expand = this.getBestExpandMove(expansionMoves);
      if (expand) {
        IO.log("Expand: ", expand);
        this.stock.spend(expand.type);
        io.grow(expand.type, expand.from, expand.x, expand.y, expand.direction);
        continue;
      }

      io.wait();
    }
  }

  getBestExpandMove(availableMoves) {
    const type = this.stock.hasStockFor("BASIC") ? "BASIC" : this.getBestTypeConsideringStock();

    let moves = availableMoves
      .map((move) => ({ ...move, score: this.bfs.simulate(move) }))
      .sort((a, b) => b.score - a.score);

    //IO.log("AM: ", moves);
    if (moves[0].score <= 0) return false;

    moves[0].type = type;
    return moves[0];
  }

  getBestDefenseAction(availableMoves) {
    const ennemyMoves = [];

    // Meilleur type d'organe pour se défendre
    const type = this.stock.hasStockFor("TENTACLE")
      ? "TENTACLE"
      : this.getBestTypeConsideringStock();

    // Ennemis proches
    for (let move of availableMoves) {
      const ennemies = this.state.getAdjacentEnnemies(move.x, move.y);
      for (let ennemy of ennemies) {
        const childrenCount = this.state.descendance[ennemy.id];
        ennemyMoves.push({ ...move, type, direction: ennemy.direction, score: childrenCount });
      }
    }

    //IO.log("ennemyMoves: ", ennemyMoves);

    if (ennemyMoves.length) {
      const ordered = ennemyMoves.sort((a, b) => b.score - a.score);
      //IO.log("ennemyMoves ordered: ", ordered);
      return ordered[0];
    }

    return false;

    // Ennemis à distance 2
    // const ennemyAvailableMoves = this.getExpansionMoves(this.players[0]);

    // const start = [];
    // for (let i = 0; i < 2; i++) {}
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
      score: this.bfs.simulate(move), // Add the score to each move
    }));
    const orderedMoves = scoredMoves.sort((a, b) => b.score - a.score);

    //IO.log("Spore target: ", targets);
    return orderedMoves[0];
  }

  getBestHarvesterAction(availableMoves) {
    if (!this.stock.hasStockFor("HARVESTER")) return false;

    //IO.log("available: ", availableMoves);

    const harvesterMoves = [];
    for (let move of availableMoves) {
      const isProtein = this.state.isCellProtein(move.x, move.y);
      let score = isProtein ? 1 : 2;
      const closeProteins = this.state.getAdjacentProteins(move.x, move.y);
      for (let protein of closeProteins) {
        harvesterMoves.push({ ...move, direction: protein.direction, type: protein.type, score });
      }
    }
    const orderedMoves = harvesterMoves.sort((a, b) => b.score - a.score);
    //console.error("Ordered: ", orderedMoves);
    //IO.log("ordered: ", orderedMoves);
    return orderedMoves[0];
  }

  getBasicMoves(moves) {
    const basicMoves = [];
    for (let move of moves) {
      let score = this.bfs.simulate(move);
      const isProtein = this.state.isCellProtein(move.x, move.y);
      if (isProtein) score -= 3;
      basicMoves.push({ ...move, score });
    }
    const orderedMoves = basicMoves.sort((a, b) => b.score - a.score);
    IO.log("Ordered: ", orderedMoves);
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
      const cells = this.state.getAdjacentFreeCells(organ.x, organ.y);
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
