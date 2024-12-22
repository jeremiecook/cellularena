import { TYPE, DIRECTIONS } from "../constants";
import Stock from "./Stock";

export default class State {
  constructor() {
    this.width = null;
    this.height = null;
    this.reset();
  }

  reset() {
    this.walls = [];
    this.players = [[], []];
    this.proteins = [];
    this.stock = new Stock();
    this.requiredActions = 0;
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
  }

  setCell(x, y, type, owner, id, direction, parent, root) {
    if (type === "WALL") {
      this.walls.push({ x, y });
      return;
    }

    if (TYPE.ORGANS.has(type)) {
      this.players[owner].push({ x, y, id, type, direction, root });
      return;
    }

    if (TYPE.PROTEINS.has(type)) {
      this.proteins.push({ x, y, type });
      return;
    }
  }

  setStock(player, a, b, c, d) {
    this.stock[player] = new Stock(a, b, c, d);
  }

  getStock(player = 1) {
    return this.stock[player];
  }

  isCellFree(x, y) {
    return (
      x >= 0 &&
      x < this.width &&
      y >= 0 &&
      y < this.height &&
      !this.walls.some((p) => p.x === x && p.y === y) &&
      !this.players.flat().some((p) => p.x === x && p.y === y)
    );
  }

  isCellProtein(x, y) {
    return this.proteins.find((p) => p.x === x && p.y === y);
  }

  isCellEnnemy(x, y) {
    return this.players[0].find((p) => p.x === x && p.y === y);
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

  getAdjacentCells(x, y) {
    return DIRECTIONS.map(([dx, dy, direction]) => ({ x: x + dx, y: y + dy, direction }));
  }

  getCloseFreeCells(x, y) {
    return this.getAdjacentCells(x, y).filter(({ x, y }) => this.isCellFree(x, y));
  }

  getAdjacentProteins(x, y) {
    return this.getAdjacentCells(x, y)
      .map(({ x: nx, y: ny, direction }) => {
        const protein = this.isCellProtein(nx, ny);
        return protein ? { x: nx, y: ny, direction, type: protein.type } : null;
      })
      .filter(Boolean); // Supprime les entrées null
  }

  getAdjacentEnnemy(x, y) {
    return this.getAdjacentCells(x, y)
      .map(({ x: nx, y: ny, direction }) => {
        const ennemy = this.isCellEnnemy(nx, ny);
        return ennemy ? { x: nx, y: ny, direction } : null;
      })
      .filter(Boolean); // Supprime les entrées null
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
}
