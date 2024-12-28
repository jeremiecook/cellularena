import { TYPE, DIRECTIONS } from "../constants";
import Cell from "./Cell";
import Stock from "./Stock";
import IO from "../utilities/IO";

export default class State {
  constructor() {
    this.width = null;
    this.height = null;
    this.reset();
  }

  reset() {
    this.map = this.createEmptyMap(this.width, this.height);
    this.control = this.createEmptyMap(this.width, this.height);

    this.walls = [];
    this.players = [];
    this.stocks = [];
    this.proteins = [];

    this.requiredActions = 0;
    this.children = [];
    this.descendance = [];
    this.harvestedCells = [];
    this.controlledCells = [];
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
  }

  setCell(x, y, type, owner, id, direction, parent, root) {
    const cell = new Cell({ x, y, type, owner, id, direction, parent, root });
    this.map[y][x] = cell;

    if (type === "WALL") {
      this.walls.push(cell);
      return;
    }

    if (cell.isOrgan()) {
      (this.players[owner] ??= []).push(cell);
      (this.children[parent] ??= []).push(id);
      return;
    }

    if (cell.isProtein()) {
      this.proteins.push({ x, y, type });
      return;
    }
  }

  calculations() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const cell = this.getCell(x, y);

        this.setCellTarget(cell);

        if (cell.type !== TYPE.ORGAN.TENTACLE && cell.type !== TYPE.ORGAN.HARVESTER) continue;

        // Détermine les cellules cibles

        const target = this.setCellTarget(cell);

        // Cellules contrôlées par une tentacule
        if (cell.type === TYPE.ORGAN.TENTACLE) {
          target?.addController(cell);
        }

        // Cellules farmées par un harvester
        if (cell.type === TYPE.ORGAN.HARVESTER) {
          target?.addHarvester(cell);
        }
      }
    }
  }

  setCellTarget(cell) {
    const { x, y } = this.getTargetPosition(cell) || [null, null];
    if (x === null || y === null || !this.isPositionInBounds(x, y)) {
      return;
    }
    cell.target = this.getCell(x, y);
    return cell.target;
  }

  getTargetPosition({ x, y, direction } = {}) {
    const directions = {
      E: [1, 0],
      W: [-1, 0],
      N: [0, -1],
      S: [0, 1],
    };

    if (!directions[direction]) {
      return null;
    }

    const [dx, dy] = directions[direction];
    return {
      x: x + dx,
      y: y + dy,
    };
  }

  setStock(player, a, b, c, d) {
    this.stocks[player] = new Stock(a, b, c, d);
  }

  isPositionInBounds(x, y) {
    return y >= 0 && y < this.height && x >= 0 && x < this.width;
  }

  isCellFree(x, y) {
    return this.isPositionInBounds(x, y) && this.getCell(x, y).isFree();
  }

  getCell(x, y) {
    return this.map[y]?.[x] || null;
  }

  isCellProtein(x, y) {
    return this.getCell(x, y)?.isProtein();
    //return this.proteins.find((p) => p.x === x && p.y === y);
  }

  isCellEnnemy(x, y) {
    return this.isPositionInBounds(x, y) && this.map[y][x] && this.map[y][x].owner === 0;
  }

  // Getters

  getStock(player = 1) {
    return this.stocks[player];
  }

  getType(x, y) {
    return this.getCell(x, y).type;
  }

  getSporerRange(sporer) {
    const reachableCells = [];
    const directions = {
      E: [1, 0],
      W: [-1, 0],
      N: [0, -1],
      S: [0, 1],
    };

    const [dx, dy] = directions[sporer.direction] || [0, 0];
    let nx = sporer.x + dx;
    let ny = sporer.y + dy;

    while (this.isCellFree(nx, ny)) {
      reachableCells.push({ x: nx, y: ny });
      nx += dx;
      ny += dy;
    }

    return reachableCells;
  }

  getOrganisms(player) {
    const organs = this.players[player];

    const groupedByRoot = Object.values(
      organs.reduce((acc, cell) => {
        (acc[cell.root] = acc[cell.root] || []).push(cell);
        return acc;
      }, {})
    );

    return groupedByRoot;
  }

  getAdjacentCells(x, y) {
    return DIRECTIONS.map(([dx, dy, direction]) => ({ x: x + dx, y: y + dy, direction }));
  }

  getAdjacentFreeCells(x, y) {
    return this.getAdjacentCells(x, y).filter(({ x, y }) => this.isCellFree(x, y));
  }

  getAdjacentProteins(x, y) {
    return this.getAdjacentCells(x, y)
      .map(({ x: nx, y: ny, direction }) => {
        const protein = this.isCellProtein(nx, ny);
        return protein ? { ...this.map[ny][nx], direction } : null;
      })
      .filter(Boolean); // Supprime les entrées null
  }

  getAdjacentEnnemies(x, y) {
    return this.getAdjacentCells(x, y)
      .map(({ x: nx, y: ny, direction }) => {
        const ennemy = this.isCellEnnemy(nx, ny);
        return ennemy ? { ...this.map[ny][nx], direction } : null;
      })
      .filter(Boolean); // Supprime les entrées null
  }

  createEmptyMap(width, height) {
    return Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => new Cell({ x, y, type: TYPE.FREE }))
    );
  }

  harvestedProteins(player = 1) {
    const harvested = { A: 0, B: 0, C: 0, D: 0 };
    const harvesters =
      this.players[player]?.filter((organ) => organ.type === TYPE.ORGAN.HARVESTER) || [];

    for (const organ of harvesters) {
      const target = organ.getTarget();
      if (target) {
        const type = this.getCell(target.x, target.y).type;
        harvested[type]++;
      }
    }
    return harvested;
  }

  getOrganTarget(organ) {
    const directions = {
      E: [1, 0],
      W: [-1, 0],
      N: [0, -1],
      S: [0, 1],
    };

    const [dx, dy] = directions[organ.direction] || [0, 0];
    let nx = organ.x + dx;
    let ny = organ.y + dy;

    return this.map[ny][nx];
  }

  /**
   * Calculate the total number of descendants for each cell.
   */
  calculateDescendance() {
    const descendantCounts = {};

    // Recursive DFS with memoization
    const countDescendants = (id) => {
      if (descendantCounts[id] !== undefined) {
        return descendantCounts[id];
      }

      // Base case: if no children, return 0
      if (!this.children[id] || this.children[id].length === 0) {
        descendantCounts[id] = 0;
        return 0;
      }

      // Count direct children + their descendants
      let total = 0;
      for (const childId of this.children[id]) {
        total += 1 + countDescendants(childId);
      }

      descendantCounts[id] = total;
      return total;
    };

    // Iterate over all parents in the children map
    for (const id of Object.keys(this.children)) {
      countDescendants(id);
    }

    this.descendance = descendantCounts;
    return descendantCounts;
  }
}
