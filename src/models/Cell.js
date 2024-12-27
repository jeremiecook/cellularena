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
    this.target = this.getTarget();
    this.controlledBy = null;
  }

  isOrgan() {
    return TYPE.ORGANS.has(this.type);
  }

  isProtein() {
    return TYPE.PROTEINS.has(this.type);
  }

  isWall() {
    return this.type === "WALL";
  }

  isFree() {
    return !this.isWall() && !this.isOrgan() && this.controlledBy?.owner !== 0;
  }

  getTarget() {
    const directions = {
      E: [1, 0],
      W: [-1, 0],
      N: [0, -1],
      S: [0, 1],
    };

    if (!directions[this.direction]) {
      return null;
    }

    const [dx, dy] = directions[this.direction];
    return {
      x: this.x + dx,
      y: this.y + dy,
    };
  }
}
