import { TYPE } from "../constants";
import IO from "../utilities/IO";

export default class Cell {
  constructor({
    x = -1,
    y = -1,
    id = 0,
    type = null,
    owner = -1,
    direction = null,
    root = null,
    parentId = 0,
  } = {}) {
    this.id = id;
    this.x = x;
    this.y = y;

    this.type = type;
    this.owner = owner;
    this.direction = direction;
    this.target = null;

    this.root = root;
    this.parentId = parentId;
    this.parent = null;
    this.children = [];

    this.adjacentCells = [];
    this.descendantsCount = 0;
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

  addTarget(target) {
    this.target = target;
  }

  getTarget() {
    return this.target;
  }

  addChild(cell) {
    this.children.push(cell);
  }

  getChildren() {
    return this.children;
  }

  getDescendantsCount() {
    if (this.descendantsCounts > 0) return this.descendantsCounts;

    this.descendantsCounts = this.getChildren().reduce((sum, child) => {
      return sum + 1 + child.getDescendantsCount();
    }, 0);

    return this.descendantsCounts;
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

  getAdjacentFreeCells() {
    return this.getAdjacentCells().filter((cell) => cell.isFree());
  }

  getAdjacentEnnemies(player = 1) {
    return this.getAdjacentCells().filter((cell) => cell.isOrgan() && player !== cell.owner);
  }
}
