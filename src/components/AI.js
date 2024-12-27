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
    this.#initializeState(state);
    this.timer = new Timer();
    //const io = new IO();

    const organisms = this.state.getOrganisms(1);
    const usedOrganisms = new Set();

    const actions = [
      { name: "Defend", handler: this.defend.bind(this) },
      { name: "Root", handler: this.root.bind(this) },
      { name: "Harvest", handler: this.harvest.bind(this) },
      { name: "Sporer", handler: this.sporer.bind(this) },
      { name: "Expand", handler: this.expand.bind(this) },
      //{ name: "Wait", handler: this.wait.bind(this) },
      // { name: "Consolidate", handler: this.consolidate.bind(this) },
    ];

    actions.forEach((action) => {
      this.#executeAction(organisms, action, usedOrganisms);
    });

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
    this.state.calculateDescendance();
    this.harvestedProteins = this.state.harvestedProteins();
  }

  /**
   * Execute actions for organisms based on a handler
   */
  #executeAction(organisms, action, usedOrganisms) {
    IO.log("Action: ", action.name);

    // Identifier la meilleure action pour chaque organisme
    const organismsActions = organisms
      .filter((organism) => !usedOrganisms.has(organism[0].id))
      .map((organism) => ({
        organism,
        ...action.handler(organism),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    // Exécuter les actions
    for (const { action: actionDetail, organism, type } of organismsActions) {
      if (type && this.stock.hasStockFor(type)) {
        IO.log("Do: ", organism[0].id, actionDetail);
        this.stock.spend(type);
        usedOrganisms.add(organism[0].id);
        console.log(actionDetail);
      }
    }
  }

  defend(organism) {
    const moves = this.getAvailableGrow(organism);
    const defend = this.getBestDefenseAction(moves);
    if (defend) {
      const action = `GROW ${defend.from} ${defend.x} ${defend.y} ${defend.type} ${defend.direction}`;
      return { action, score: defend.score, type: defend.type };
    }
  }

  root(organism) {
    //const moves = this.getAvailableGrow(organism);
    const root = this.getBestRootAction(organism);
    if (root) {
      this.sporersDone.push(root.from);
      const action = `SPORE ${root.from} ${root.x} ${root.y}`;
      return { action, score: root.score, type: "ROOT" };
    }
  }

  harvest(organism) {
    const moves = this.getAvailableGrow(organism);
    const harvest = this.getBestHarvesterAction(moves);
    if (harvest) {
      const action = `GROW ${harvest.from} ${harvest.x} ${harvest.y} HARVESTER ${harvest.direction}`;
      return {
        action,
        score: harvest.score,
        type: "HARVESTER",
      };
    }
  }

  expand(organism) {
    const moves = this.getAvailableGrow(organism);
    const expand = this.getBestExpandAction(moves);
    if (expand) {
      return {
        action: `GROW ${expand.from} ${expand.x} ${expand.y} ${expand.type} ${expand.direction}`,
        score: expand.score,
        type: expand.type,
      };
    }
  }

  sporer(organism) {
    const moves = this.getAvailableGrow(organism);
    const sporer = this.getBestSporerAction(moves);
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

  getBestExpandAction(availableMoves) {
    const type = this.stock.hasStockFor("BASIC") ? "BASIC" : this.getBestTypeConsideringStock();

    let moves = availableMoves
      .map((move) => ({ ...move, score: this.bfs.simulate(move) }))
      .sort((a, b) => b.score - a.score);

    if (!moves.length || moves[0].score <= 0) return false;

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
        ennemyMoves.push({ ...move, type, direction: ennemy.direction, score: 1 + childrenCount });
      }
    }

    if (ennemyMoves.length) {
      const ordered = ennemyMoves.sort((a, b) => b.score - a.score);
      return ordered[0];
    }

    return false;

    // Ennemis à distance 2
    // const ennemyAvailableMoves = this.getAvailableGrow(this.players[0]);

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
    return orderedMoves[0];
  }

  getBestHarvesterAction(availableMoves) {
    if (!this.stock.hasStockFor("HARVESTER")) return false;

    const harvestedProteins = this.harvestedProteins; // {A:0, B:1, C:2, D:0}
    const proteinPriority = { B: 5, C: 5, D: 3, A: 1 };
    let isTargetProtein = false;

    const harvesterMoves = [];

    for (let move of availableMoves) {
      const isTargetProtein = this.state.isCellProtein(move.x, move.y);
      let score = isTargetProtein ? 1 : 2;
      const closeProteins = this.state.getAdjacentProteins(move.x, move.y);
      for (let protein of closeProteins) {
        if (this.harvestedProteins[protein.type] === 0) score += 5;
        harvesterMoves.push({ ...move, direction: protein.direction, type: protein.type, score });
      }
    }
    const orderedMoves = harvesterMoves.sort((a, b) => b.score - a.score);
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
    return orderedMoves;
  }

  getBestSporerAction(moves) {
    IO.log("SPORER: ", moves);
    if (!this.stock.hasStockFor("SPORER")) return false;
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
    return orderedMoves[0];
  }

  getAvailableGrow(organism) {
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
