import { TYPE, DIRECTIONS } from "../constants";
import Stock from "./Stock";

export default class State {
  constructor() {
    this.width = null;
    this.height = null;
    this.reset();
  }

  reset() {
    this.map = this.createEmptyMap(this.width, this.height);

    this.walls = [];
    this.players = [];
    this.stocks = [];
    this.proteins = [];

    this.requiredActions = 0;
    this.children = [];
    this.descendance = [];
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
  }

  setCell(x, y, type, owner, id, direction, parent, root) {
    this.map[y][x] = { x, y, type, owner, id, direction, parent, root };

    if (type === "WALL") {
      this.walls.push({ x, y });
      return;
    }

    if (TYPE.ORGANS.has(type)) {
      (this.players[owner] ??= []).push({ x, y, id, type, direction, root, parent });
      (this.children[parent] ??= []).push(id);
      return;
    }

    if (TYPE.PROTEINS.has(type)) {
      this.proteins.push({ x, y, type });
      return;
    }
  }

  setStock(player, a, b, c, d) {
    this.stocks[player] = new Stock(a, b, c, d);
  }

  isCellInBounds(x, y) {
    return y >= 0 && y < this.height && x >= 0 && x < this.width;
  }

  isCellFree(x, y) {
    return (
      this.isCellInBounds(x, y) &&
      this.map[y][x].type !== "WALL" &&
      this.map[y][x].owner !== 0 &&
      this.map[y][x].owner !== 1
    );
  }

  isCellProtein(x, y) {
    return this.proteins.find((p) => p.x === x && p.y === y);
  }

  isCellEnnemy(x, y) {
    return this.isCellInBounds(x, y) && this.map[y][x] && this.map[y][x].owner === 0;
  }

  // Getters

  getStock(player = 1) {
    return this.stocks[player];
  }

  getType(x, y) {
    return this.map[y][x].type;
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
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ type: null }))
    );
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
