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
    this.organs = {};
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

  setCell(x, y, type, owner, id, direction, parentId, root) {
    const cell = new Cell({ x, y, type, owner, id, parentId, direction, root });
    this.map[y][x] = cell;

    if (type === "WALL") {
      this.walls.push(cell);
      return;
    }

    if (cell.isOrgan()) {
      this.organs[id] = cell;
      (this.players[owner] ??= []).push(cell);
      (this.children[parentId] ??= []).push(id);
      return;
    }

    if (cell.isProtein()) {
      this.proteins.push({ x, y, type });
      return;
    }
  }

  /**
   * Pré-calcule différentes données liées aux cellules
   * @param
   * @returns
   */
  calculations() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const cell = this.getCell(x, y);

        if (!cell) continue;

        this.setAdjacentCells(cell);

        if (cell.isOrgan()) {
          this.setCellTarget(cell);
          this.setParentAndChildren(cell);
        }
      }
    }
  }

  /**
   * Crée une relation parent / enfant dans les cellules
   * @param {*} cell
   * @returns
   */
  setParentAndChildren(cell) {
    if (!cell.isOrgan()) return;

    if (cell.parentId > 0) {
      const parentCell = this.organs[cell.parentId];
      cell.parent = parentCell;
      parentCell.addChild(cell);
    }
  }

  /**
   * Identifie les cellules voisines et met à jour les données de la cellule
   * @param {*} cell
   * @returns
   */
  setAdjacentCells(cell) {
    for (const [dx, dy, direction] of DIRECTIONS) {
      const adjacentCell = this.getCell(cell.x + dx, cell.y + dy);
      if (adjacentCell) cell.addAdjacentCell(adjacentCell);
    }
  }

  /**
   * Identifie la cellule cible d'un organe et met à jour les deux cellules
   * @param {*} cell
   * @returns
   */
  setCellTarget(cell) {
    if (cell.type !== TYPE.ORGAN.TENTACLE && cell.type !== TYPE.ORGAN.HARVESTER) return;

    const { x, y } = this.getTargetPosition(cell);
    if (!this.isPositionInBounds(x, y)) return;

    const target = this.getCell(x, y);

    cell.addTarget(target);

    // Cellules contrôlées par une tentacule
    if (cell.type === TYPE.ORGAN.TENTACLE) {
      target?.addController(cell);
    }

    // Cellules farmées par un harvester
    if (target.isProtein() && cell.type === TYPE.ORGAN.HARVESTER) {
      target?.addHarvester(cell);
    }

    return target;
  }

  getTargetPosition({ x, y, direction } = {}) {
    const directions = {
      E: [1, 0],
      W: [-1, 0],
      N: [0, -1],
      S: [0, 1],
    };

    if (!directions[direction]) {
      return { x: null, y: null };
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

  getProteins() {
    return this.proteins;
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

    let targetCell = this.getCell(nx, ny);

    while (targetCell && targetCell.isFree()) {
      reachableCells.push(targetCell);
      nx += dx;
      ny += dy;
      targetCell = this.getCell(nx, ny);
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

  getHarvestedProteins(player = 1) {
    if (this.harvestedProteins) return harvestedProteins;

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
    this.harvestedProtein = harvested;
    return harvested;
  }

  isHarvestingProtein(type, player = 1) {
    const harvested = this.getHarvestedProteins(player);

    return harvested[type] > 0;
  }

  // getOrganTarget(organ) {
  //   const directions = {
  //     E: [1, 0],
  //     W: [-1, 0],
  //     N: [0, -1],
  //     S: [0, 1],
  //   };

  //   const [dx, dy] = directions[organ.direction] || [0, 0];
  //   let nx = organ.x + dx;
  //   let ny = organ.y + dy;

  //   return this.map[ny][nx];
  // }
}
