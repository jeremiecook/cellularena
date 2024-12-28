import { TYPE } from "../constants";

export default class Cell {
  constructor({
    x = -1,
    y = -1,
    id = 0,
    type = null,
    owner = null,
    direction = null,
    root = null,
    parent = null,
  } = {}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.owner = owner;
    this.root = root;
    this.parent = parent;
    this.direction = direction;
    this.adjacentCells = [];
    this.childrenCells = [];
    this.descendantCount = 0;
    this.target = null;
    this.controlledBy = [];
    this.harvestedBy = [];
  }

  isOrgan() {
    return Object.values(TYPE.ORGAN).includes(this.type);
  }

  isProtein() {
    return Object.values(TYPE.PROTEIN).includes(this.type);
  }

  isWall() {
    return this.type === TYPE.WALL;
  }

  isFree() {
    return !this.isWall() && !this.isOrgan() && !this.isControlledBy(0);
  }

  getTarget() {
    return this.target;
  }

  addHarvester(cell) {
    this.harvestedBy.push(cell);
  }

  getHarvesters() {
    return this.harvestedBy;
  }

  isHarvestedBy(player = 1) {
    return this.harvestedBy.filter((cell) => cell.owner === player).length;
  }

  addController(cell) {
    this.controlledBy.push(cell);
  }

  getControllers() {
    return this.controlledBy;
  }

  isControlledBy(player = 1) {
    return this.controlledBy.filter((cell) => cell.owner === player).length;
  }

  addAdjacentCell(cell) {
    this.adjacentCells.push(cell);
  }

  getAdjacentCells() {
    return this.adjacentCells;
  }

  getAdjacentProteins() {
    return this.getAdjacentCells().filter((cell) => cell.isProtein());
  }

  getAdjacentFree() {
    return this.getAdjacentCells().filter((cell) => cell.isFree());
  }
}
