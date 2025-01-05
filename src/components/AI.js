import { DIRECTIONS } from "../constants";
import State from "../models/State";
import Cell from "../models/Cell";
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
   * Find next move
   * @param {State} state - Current game state
   */
  next(state) {
    this.#initializeState(state);
    this.timer = new Timer();

    const organisms = this.state.getOrganisms(1);
    const usedOrganisms = new Set();
    const occupiedCells = new Set();

    const actions = [
      { name: "Close Defense", handler: (organism) => this.closeDefense(organism) },
      { name: "2 Cells Defense", handler: (organism) => this.getBest2CellsDefense(organism) },
      { name: "Secure", handler: (organism) => this.secure(organism) },
      { name: "New Root", handler: (organism) => this.getBestRootAction(organism) },
      { name: "Harvest proteins", handler: (organism) => this.harvestCloseProteins(organism) },
      { name: "New Sporer", handler: (organism) => this.growNewSporer(organism) },
      { name: "Find Missing Proteins", handler: (organism) => this.findMissingProtein(organism) },
      { name: "Cherry Pick", handler: (organism) => this.cherryPick(organism) },
      { name: "Expand", handler: (organism) => this.expand(organism) },
      { name: "Consolidate", handler: (organism) => this.consolidate(organism, usedOrganisms) },
      { name: "Finish", handler: (organism) => this.finish(organism, usedOrganisms) },
      { name: "Wait", handler: (organism) => this.justWait(organism) },
    ];

    actions.forEach((action) => {
      this.#executeAction(organisms, action, usedOrganisms);
    });
  }

  /**
   * Execute actions for organisms based on a handler
   */
  #executeAction(organisms, action, usedOrganisms) {
    Logger.log(action.name);

    // Identifier la meilleure action pour chaque organisme
    const organismsActions = organisms
      .filter((organism) => !usedOrganisms.has(organism[0].id))
      .map((organism) => ({
        organism,
        ...action.handler(organism),
      }))
      .filter(({ score, x, y }) => score > 0)
      .sort((a, b) => b.score - a.score);

    // Exécuter les actions

    for (const { command, organism, type, x, y } of organismsActions) {
      if (type && this.stock.hasStockFor(type) && !this.reservedCells.has(`${x},${y}`)) {
        Logger.log("- From:", organism[0].id, " ", command);
        this.stock.spend(type);
        console.log(command);
        usedOrganisms.add(organism[0].id);
        this.reserveCell(x, y);
      }

      if (command === "WAIT") {
        console.log(command);
      }
    }
    //this.timer.top();
  }

  closeDefense(organism) {
    // Meilleur type d'organe pour se défendre
    const defenseType = this.stock.hasStockFor("TENTACLE")
      ? "TENTACLE"
      : this.getBestTypeConsideringStock();

    // Ennemis proches
    const availableMoves = this.getAvailableGrow(organism);

    // Score calculation helper
    const calculateScore = (move) =>
      100 * (move.organ.getDescendantsCount() + 1) + move.target.getDescendantsCount() + 1;

    const ennemyMoves = availableMoves.flatMap((move) => {
      const ennemies = move.target.getAdjacentEnnemies();
      return ennemies.map((ennemy) => ({
        x: move.target.x,
        y: move.target.y,
        from: move.from,
        type: defenseType,
        direction: this.getDirection(move.target, ennemy),
        score: calculateScore(move),
      }));
    });

    if (!ennemyMoves.length) return false;

    const best = ennemyMoves.sort((a, b) => b.score - a.score)[0];
    const command = `GROW ${best.from} ${best.x} ${best.y} ${best.type} ${best.direction}`;
    return { command, score: best.score, type: best.type, x: best.x, y: best.y };
  }

  getBest2CellsDefense(organism) {
    if (!this.stock.hasStockFor("TENTACLE")) return false;

    // Ennemis proches
    const availableMoves = this.getAvailableGrow(organism);

    // Score calculation helper
    const calculateScore = (move) => 100 * move.organ.getDescendantsCount() + 1;

    const defenseMoves = availableMoves.flatMap((move) => {
      const adjacentWithEnnemies = move.target
        .getAdjacentCells()
        .filter((cell) => !cell.isWall() && !cell.isOrgan() && !cell.isControlledBy(1))
        .filter((cell) => cell.getAdjacentEnnemies().length > 0);

      return adjacentWithEnnemies.map((cell) => ({
        x: move.target.x,
        y: move.target.y,
        from: move.from,
        type: "TENTACLE",
        direction: this.getDirection(move.target, cell),
        score: calculateScore(move),
      }));
    });

    if (!defenseMoves.length) return false;

    const best = defenseMoves.sort((a, b) => b.score - a.score)[0];
    const command = `GROW ${best.from} ${best.x} ${best.y} TENTACLE ${best.direction}`;
    return { command, score: best.score, type: best.type, x: best.x, y: best.y };
  }

  secure(organism) {
    if (!this.stock.hasStockFor("TENTACLE")) return false;
    const availableMoves = this.getAvailableGrow(organism);
    const bestSecureMoves = [];

    const threats = this.bfs.threats(availableMoves);
    if (threats.length === 0) return;

    for (let cell of threats) {
      for (let block of cell.adjacentCells) {
        const newSituation = this.bfs.threats(availableMoves, [block]);

        // Seulement pour les coups les plus évidents
        // TODO : améliorable dans certaines situations
        if (newSituation.length > 0) continue;
        //if (newSituation.length >= threats.length) continue;

        //Logger.log("TR", threats, newSituation);

        bestSecureMoves.push({
          x: cell.x,
          y: cell.y,
          from: cell.from,
          type: "TENTACLE",
          direction: this.getDirection(cell, block),
          score: 5,
        });
      }
    }

    //Logger.log("MOVES", bestSecureMoves);

    if (bestSecureMoves.length === 0) return false;

    const best = bestSecureMoves[0];
    const command = `GROW ${best.from} ${best.x} ${best.y} TENTACLE ${best.direction}`;
    return { command, score: best.score, type: best.type, x: best.x, y: best.y };

    return false;
  }

  harvestCloseProteins(organism) {
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

        let score = 1 - harvestedProteins[protein.type];
        harvesterMoves.push({
          x: move.target.x,
          y: move.target.y,
          from: move.from,
          direction: this.getDirection(move.target, protein),
          score,
        });
      }
    }

    const best = harvesterMoves.sort((a, b) => b.score - a.score)[0] || null;

    if (best) {
      const command = `GROW ${best.from} ${best.x} ${best.y} HARVESTER ${best.direction}`;
      return {
        command,
        score: best.score,
        type: "HARVESTER",
        x: best.x,
        y: best.y,
      };
    }
  }

  growNewSporer(organism) {
    if (!this.stock.hasStockForAll(["SPORER", "ROOT", "HARVESTER"])) return false;

    const sporerMoves = [];
    const moves = this.getAvailableGrow(organism);
    for (let move of moves) {
      if (this.state.getCell(move.target.x, move.target.y).isHarvestedBy(1)) continue;

      for (let direction of DIRECTIONS) {
        const sporerRangeCells = this.state.getSporerRange({
          x: move.target.x,
          y: move.target.y,
          direction: direction[2],
        });

        const score = sporerRangeCells
          .filter((cell) => this.getManhattanDistance(move.target, cell) >= 3)
          .reduce((max, cell) => Math.max(max, this.bfs.simulate(cell)), -Infinity);

        if (score > 0)
          sporerMoves.push({
            x: move.target.x,
            y: move.target.y,
            from: move.from,
            direction: direction[2],
            score,
          });
      }
    }
    const orderedMoves = sporerMoves.sort((a, b) => b.score - a.score);
    const best = orderedMoves[0];

    if (best) {
      const command = `GROW ${best.from} ${best.x} ${best.y} SPORER ${best.direction}`;
      return { command, score: best.score, type: "SPORER", x: best.x, y: best.y };
    }
  }

  getBestRootAction(organism) {
    if (!this.organismHasSporer(organism)) return false;
    if (!this.stock.hasStockForAll(["ROOT", "HARVESTER"])) return false;

    const sporers = organism.filter((item) => item.type === "SPORER");
    const targets = [];
    for (let sporer of sporers) {
      if (this.sporersDone.includes(sporer.id)) continue;
      const sporerRange = this.state
        .getSporerRange(sporer)
        .filter((cell) => this.getManhattanDistance(sporer, cell) >= 2)
        .map((move) => ({ ...move, from: sporer.id }));

      targets.push(...sporerRange);
    }

    const scoredMoves = targets.map((move) => ({
      ...move,
      score: this.bfs.simulate(move), // Add the score to each move
    }));
    const orderedMoves = scoredMoves.sort((a, b) => b.score - a.score);
    const best = orderedMoves[0];

    if (best) {
      this.sporersDone.push(best.from);
      const command = `SPORE ${best.from} ${best.x} ${best.y}`;
      return { command, score: best.score, type: "ROOT", x: best.x, y: best.y };
    }
  }

  // Calculate best move for each action
  findMissingProtein(organism) {
    if (!this.stock.hasStockFor("HARVESTER")) return false;

    const missingProteins = Object.entries(this.state.getHarvestedProteins())
      .filter(([key, value]) => value === 0)
      .map(([key]) => key);

    const type = this.stock.hasStockFor("BASIC") ? "BASIC" : this.getBestTypeConsideringStock();
    const foundProteins = this.pathFindProtein(organism, missingProteins).filter(
      (cell) =>
        !this.state.getCell(cell.firstMove.x, cell.firstMove.y).isHarvestedBy(1) &&
        !this.state.getCell(cell.firstMove.x, cell.firstMove.y).isProtein()
    );

    if (!foundProteins || foundProteins.length === 0) return false;

    const best = foundProteins[0];
    //Logger.log("Proteins", foundProteins, best);
    const command = `GROW ${best.firstCellId} ${best.firstMove.x} ${best.firstMove.y} ${type} S`;
    return { command, score: best.distance, type: type, x: best.x, y: best.y };
  }

  // Calculate best move for each action
  cherryPick(organism) {
    const missingProteins = Object.entries(this.stock.getStock())
      .filter(([key, value]) => value <= 1)
      .map(([key]) => key);

    const availableProteins = this.getAvailableGrow(organism).filter((move) => {
      const cell = move.target;
      return cell.isProtein() && !cell.isHarvestedBy(1) && missingProteins.includes(cell.type);
    });

    if (!availableProteins || !availableProteins.length) return;

    //Logger.log("cherryPick", availableProteins);
    const type = this.stock.hasStockFor("BASIC") ? "BASIC" : this.getBestTypeConsideringStock();
    const best = availableProteins[0];

    if (best) {
      const command = `GROW ${best.from} ${best.target.x} ${best.target.y} ${type} S`;
      return { command, score: 1, type: type, x: best.target.x, y: best.target.y };
    }
  }

  justWait() {
    return {
      command: `WAIT`,
      score: 1,
      type: "WAIT", // TODO rendre ça plus clean (ligne inutile)
    };
  }

  expand(organism, consolidate = false, finish = false) {
    const availableMoves = this.getAvailableGrow(organism);

    const type = this.stock.hasStockFor("BASIC") ? "BASIC" : this.getBestTypeConsideringStock();

    let expandMoves = [];
    for (let move of availableMoves) {
      let score = this.bfs.simulate(move.target);
      const harvested = this.state.getCell(move.target.x, move.target.y).isHarvestedBy(1);
      if (harvested) score -= 3;
      expandMoves.push({
        x: move.target.x,
        y: move.target.y,
        from: move.from,
        direction: "S",
        score,
      });
    }

    const best = expandMoves.sort((a, b) => b.score - a.score)[0] || null;
    const minScore = consolidate ? -Infinity : 0;
    const baseScore = finish ? 100 : 1;

    if (best && best.score > minScore) {
      return {
        command: `GROW ${best.from} ${best.x} ${best.y} ${type} ${best.direction}`,
        score: baseScore + best.score,
        type: type,
        x: best.x,
        y: best.y,
      };
    }
  }

  consolidate(organism, usedOrganisms) {
    if (usedOrganisms.size === 0 || this.stock.isSafe()) return this.expand(organism, true);
  }

  finish(organism, usedOrganisms) {
    if (usedOrganisms.size === 0) return this.expand(organism, true, true);
  }

  /**
   * Récupère tous les coups possibles pour s'étendre (en Grow)
   * @param {*} organism
   * @returns {from: number, target: Cell, direction: string}
   */
  getAvailableGrow(organism) {
    //const organismId = organism[0].id;
    //if (this.availableGrow[organismId]) return this.availableGrow[organismId];

    return organism.flatMap((organ) => {
      return organ
        .getAdjacentFreeCells()
        .filter((cell) => !this.reservedCells.has(`${cell.x},${cell.y}`))
        .map((cell) => ({
          from: organ.id,
          organ: organ,
          target: cell,
          direction: this.getDirection(organ, cell),
        }));
    });
  }

  getManhattanDistance(cell1, cell2) {
    if (!cell1 || !cell2) {
      throw new Error("Both cell1 and cell2 must be provided");
    }

    return Math.abs(cell1.x - cell2.x) + Math.abs(cell1.y - cell2.y);
  }

  pathFindProtein(organism, types, limit = 4) {
    const visited = new Set();
    const queue = [];
    const results = [];

    // Initialize the queue with the starting organism cells
    organism.forEach((cell) => {
      queue.push({ x: cell.x, y: cell.y, distance: 0, firstMove: null, firstCellId: cell.id });
      visited.add(`${cell.x},${cell.y}`);
    });

    while (queue.length > 0) {
      const { x, y, distance, firstMove, firstCellId } = queue.shift();

      // If we've reached the limit, stop searching further
      if (distance > limit) continue;

      const currentCell = this.state.getCell(x, y);
      if (!currentCell) continue;

      // Check if this cell contains one of the desired protein types
      if (currentCell.isProtein() && types.includes(currentCell.type)) {
        results.push({
          protein: { x, y, type: currentCell.type },
          firstMove: firstMove || { x, y }, // First move or the current position
          firstCellId,
          distance,
        });
        continue; // Continue to find more proteins
      }

      // Explore adjacent cells
      const neighbors = currentCell.getAdjacentCells();
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && neighbor.isFree()) {
          visited.add(key);
          queue.push({
            x: neighbor.x,
            y: neighbor.y,
            distance: distance + 1,
            firstMove: firstMove || { x: neighbor.x, y: neighbor.y }, // Record the first move
            firstCellId, // Propagate the first cell's ID
          });
        }
      }
    }

    return results;
  }

  getDirection(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Find the matching direction
    const direction = DIRECTIONS.find(([dirX, dirY]) => dirX === dx && dirY === dy);

    // Return the direction name or null if not found
    return direction ? direction[2] : null;
  }

  getBestTypeConsideringStock() {
    const stock = this.stock.getStock();
    if (stock.A > 0) return "BASIC";

    const typeScores = {
      BASIC: stock.A > 0 ? stock.A : 0,
      HARVESTER: stock.C > 0 && stock.D > 0 ? stock.C + stock.D : 0,
      TENTACLE: stock.B > 0 && stock.C > 0 ? stock.B + stock.C : 0,
      SPORER: stock.B > 0 && stock.D > 0 ? stock.B + stock.D : 0,
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
