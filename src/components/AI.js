import { DIRECTIONS } from "../constants";
import State from "../models/State";
import Cell from "../models/Cell";
import IO from "../utilities/IO";
import Logger from "../utilities/Logger";
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
    this.#initializeState(state);
    this.timer = new Timer();
    //const io = new IO();

    const organisms = this.state.getOrganisms(1);
    const usedOrganisms = new Set();
    const occupiedCells = new Set();

    const actions = [
      { name: "Defend", handler: this.defend.bind(this) },
      { name: "Root", handler: this.root.bind(this) },

      { name: "Harvest", handler: this.harvest.bind(this) },
      { name: "Sporer", handler: this.sporer.bind(this) },
      { name: "Expand", handler: this.expand.bind(this) },
    ];

    actions.forEach((action) => {
      this.#executeAction(organisms, action, usedOrganisms, occupiedCells);
    });

    // Consolidation à la fin
    if (usedOrganisms.size === 0) {
      Logger.log("CONSOLIDATE");
      this.#executeAction(
        organisms,
        { name: "Consolidate", handler: this.consolidate.bind(this) },
        usedOrganisms,
        occupiedCells
      );
    }

    // WAIT pour les actions non selectionnées
    for (let i = 0; i < organisms.length - usedOrganisms.size; i++) {
      console.log("WAIT");
    }
  }

  /**
   * Initialize state and perform calculations
   * @param {State} state - Current game state
   */
  #initializeState(state) {
    this.state = state;
    this.timer = new Timer();
    this.availableGrow = [];
    this.reservedCells = new Set();
    this.stock = this.state.getStock(1);

    this.bfs = new BFS(state);
    this.state.calculations();
    this.harvestedProteins = this.state.harvestedProteins;
  }

  /**
   * Execute actions for organisms based on a handler
   */
  #executeAction(organisms, action, usedOrganisms, occupiedCells) {
    // Identifier la meilleure action pour chaque organisme
    const organismsActions = organisms
      .filter((organism) => !usedOrganisms.has(organism[0].id))
      .map((organism) => ({
        organism,
        ...action.handler(organism),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    // Exécuter les actions1
    Logger.log(action.name);
    for (const { action: actionDetail, organism, type } of organismsActions) {
      if (type && this.stock.hasStockFor(type)) {
        Logger.log("From: ", organism[0].id, " ", actionDetail);
        this.stock.spend(type);
        usedOrganisms.add(organism[0].id);
        //occupiedCells.add(`${x},${y}`);
        console.log(actionDetail);
      }
    }
    this.timer.top();
  }

  defend(organism) {
    const defend = this.getBestDefenseAction(organism);
    //Logger.log("DEFEND", defend);
    if (defend) {
      const action = `GROW ${defend.from} ${defend.x} ${defend.y} ${defend.type} ${defend.direction}`;
      return { action, score: defend.score, type: defend.type };
    }
  }

  root(organism) {
    //const moves = this.getAvailableGrowOld(organism);
    const root = this.getBestRootAction(organism);
    if (root) {
      this.sporersDone.push(root.from);
      const action = `SPORE ${root.from} ${root.x} ${root.y}`;
      return { action, score: root.score, type: "ROOT" };
    }
  }

  harvest(organism) {
    const harvest = this.getBestHarvesterAction(organism);
    if (harvest) {
      const action = `GROW ${harvest.from} ${harvest.x} ${harvest.y} HARVESTER ${harvest.direction}`;
      return {
        action,
        score: harvest.score,
        type: "HARVESTER",
      };
    }
  }

  expand(organism, consolidate = false) {
    const moves = this.getAvailableGrowOld(organism);
    const expand = this.getBestExpandAction(moves, consolidate);
    if (expand) {
      return {
        action: `GROW ${expand.from} ${expand.x} ${expand.y} ${expand.type} ${expand.direction}`,
        score: expand.score + 1,
        type: expand.type,
      };
    }
  }

  consolidate(organism) {
    const moves = this.getAvailableGrowOld(organism);
    const consolidate = this.getBestExpandAction(moves, true);
    if (consolidate) {
      return {
        action: `GROW ${consolidate.from} ${consolidate.x} ${consolidate.y} ${consolidate.type} ${consolidate.direction}`,
        score: consolidate.score + 1,
        type: consolidate.type,
      };
    }
  }

  sporer(organism) {
    const sporer = this.getBestSporerAction(organism);
    if (!this.organismHasSporer(organism) && sporer) {
      const action = `GROW ${sporer.from} ${sporer.x} ${sporer.y} SPORER ${sporer.direction}`;
      return { action, score: sporer.score, type: "SPORER" };
    }
  }

  wait() {
    return {
      action: `WAIT`,
      score: 1,
    };
  }

  // Calculate best move for each action

  getBestExpandAction(availableMoves, consolidate = false) {
    const type = this.stock.hasStockFor("BASIC") ? "BASIC" : this.getBestTypeConsideringStock();

    let moves = availableMoves
      .map((move) => {
        let score = this.bfs.simulate(move);
        const harvested = this.state.getCell(move.x, move.y).isHarvestedBy(1);
        if (harvested) score -= 5;
        return { ...move, score };
      })
      .sort((a, b) => b.score - a.score);

    if (consolidate) Logger.log(moves[0]);
    if (!moves.length) return false;
    if (!consolidate && moves[0].score <= 0) return false;

    moves[0].type = type;
    return moves[0];
  }

  getBestDefenseAction(organism) {
    const ennemyMoves = [];

    // Meilleur type d'organe pour se défendre
    const defenseType = this.stock.hasStockFor("TENTACLE")
      ? "TENTACLE"
      : this.getBestTypeConsideringStock();

    // Ennemis proches
    const availableMoves = this.getAvailableGrow(organism);
    for (let move of availableMoves) {
      let score = 0;
      let direction = null;

      const adjacentCells = move.target.getAdjacentCells().filter((cell) => !cell.isWall());
      for (let cell of adjacentCells) {
        const adjacentEnemies = cell.getAdjacentEnnemies();
        if (adjacentEnemies.length > 0) {
          score = Math.max(score, 1 + move.target.getDescendantsCount());
          //if (cell.isControlledBy(1)) score -= 1;
          direction = this.getDirection(move.target, cell);
        }
      }

      const ennemies = move.target.getAdjacentEnnemies();
      for (let ennemy of ennemies) {
        score = 1000 + move.target.getDescendantsCount();
        direction = this.getDirection(move.target, ennemy);
      }

      // TODO : prioriser mes cellules importantes
      if (score > 0) {
        ennemyMoves.push({
          x: move.target.x,
          y: move.target.y,
          from: move.from,
          type: defenseType,
          direction: direction,
          score: score,
        });
      }
    }

    if (ennemyMoves.length) {
      const ordered = ennemyMoves.sort((a, b) => b.score - a.score);
      return ordered[0];
    }

    return false;
  }

  getBestRootAction(organism) {
    if (!this.organismHasSporer(organism)) return false;
    if (!this.stock.hasStockForAll(["ROOT"])) return false;

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
    return orderedMoves[0];
  }

  getBestHarvesterAction(organism) {
    // TODO:
    // On n'écrase pas une proteine déjà harvested sauf si la cible est plus importante
    // Plus importante : 2 d'écart entre l'actuelle et la nouvelle

    if (!this.stock.hasStockFor("HARVESTER")) return false;

    const harvesterMoves = [];
    const harvestedProteins = this.state.getHarvestedProteins(); // {A:0, B:1, C:2, D:0}
    const availableMoves = this.getAvailableGrow(organism);

    for (let move of availableMoves) {
      const closeProteins = move.target.getAdjacentProteins();

      for (let protein of closeProteins) {
        if (move.target.isHarvestedBy(1)) continue;
        // TODO : si la cellule cible vaut le coup, on écrase quand même

        let score = 2 - harvestedProteins[protein.type];
        harvesterMoves.push({
          x: move.target.x,
          y: move.target.y,
          from: move.from,
          direction: this.getDirection(move.target, protein),
          score,
        });
      }
    }

    return harvesterMoves.sort((a, b) => b.score - a.score)[0] || null;
  }

  getDirection(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Find the matching direction
    const direction = DIRECTIONS.find(([dirX, dirY]) => dirX === dx && dirY === dy);

    // Return the direction name or null if not found
    return direction ? direction[2] : null;
  }

  /**
   * Récupère tous les coups possibles pour s'étendre (en Grow)
   * @param {*} organism
   * @returns {from: number, target: Cell, direction: string}
   */
  getAvailableGrow(organism) {
    return organism.flatMap((organ) => {
      return organ.getAdjacentFreeCells().map((cell) => ({
        from: organ.id,
        target: cell,
        direction: this.getDirection(organ, cell),
      }));
    });
  }

  getBestSporerAction(organism) {
    if (!this.stock.hasStockForAll(["SPORER", "ROOT", "HARVESTER"])) return false;
    const sporerMoves = [];
    const moves = this.getAvailableGrowOld(organism);
    for (let move of moves) {
      if (this.state.getCell(move.x, move.y).isHarvestedBy(1)) continue;

      for (let direction of DIRECTIONS) {
        const sporerRangeCells = this.state.getSporerRange({
          x: move.x,
          y: move.y,
          direction: direction[2],
        });

        const score = sporerRangeCells.reduce((sum, cell) => sum + this.bfs.simulate(cell), 0);
        if (score > 5) sporerMoves.push({ ...move, direction: direction[2], score });
      }
    }
    const orderedMoves = sporerMoves.sort((a, b) => b.score - a.score);
    return orderedMoves[0];
  }

  getAvailableGrowOld(organism) {
    const organismId = organism[0].id;
    if (this.availableGrow[organismId]) return this.availableGrow[organismId];

    const moves = [];

    for (const organ of organism) {
      const cells = this.state.getAdjacentFreeCells(organ.x, organ.y);
      cells.forEach((cell) => moves.push({ from: organ.id, ...cell }));
    }

    this.availableGrow[organismId] = moves;
    return moves;
  }

  getBestTypeConsideringStock() {
    const stock = this.stock.getStock();

    if (stock.a > 0) return "BASIC";

    const typeScores = {
      BASIC: stock.a > 0 ? stock.a : 0,
      HARVESTER: stock.c > 0 && stock.d ? stock.c + stock.d : 0,
      TENTACLE: stock.b > 0 && stock.c ? stock.b + stock.c : 0,
      SPORER: stock.b > 0 && stock.d ? stock.b + stock.d : 0,
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
