export default class IO {
  static #instance;

  constructor(state) {
    if (IO.#instance) return IO.#instance;

    this.state = state;
    this.init();

    IO.#instance = this;
  }

  init() {
    var [width, height] = readline().split(" ").map(Number);
    this.state.setDimensions(width, height);
  }

  read() {
    this.#entities();
    this.#proteinStock();
    this.#requiredActions();
  }

  grow(type, from, x, y, direction) {
    console.log(`GROW ${from} ${x} ${y} ${type} ${direction}`);
  }

  wait() {
    console.log("WAIT");
  }

  spore(from, x, y) {
    console.log(`SPORE ${from} ${x} ${y}`);
  }

  #entities() {
    const entityCount = parseInt(readline());
    for (let i = 0; i < entityCount; i++) {
      var inputs = readline().split(" ");
      const x = parseInt(inputs[0]);
      const y = parseInt(inputs[1]); // grid coordinate
      const type = inputs[2]; // WALL, ROOT, BASIC, TENTACLE, HARVESTER, SPORER, A, B, C, D
      const owner = parseInt(inputs[3]); // 1 if your organ, 0 if enemy organ, -1 if neither
      const id = parseInt(inputs[4]); // id of this entity if it's an organ, 0 otherwise
      const direction = inputs[5]; // N,E,S,W or X if not an organ
      const organParentId = parseInt(inputs[6]);
      const organRootId = parseInt(inputs[7]);

      this.state.setCell(x, y, type, owner, id, direction, organParentId, organRootId);
    }
  }

  #proteinStock() {
    var inputs = readline().split(" ");
    const myA = parseInt(inputs[0]);
    const myB = parseInt(inputs[1]);
    const myC = parseInt(inputs[2]);
    const myD = parseInt(inputs[3]); // your protein stock
    this.state.setStock(1, myA, myB, myC, myD);

    var inputs = readline().split(" ");
    const oppA = parseInt(inputs[0]);
    const oppB = parseInt(inputs[1]);
    const oppC = parseInt(inputs[2]);
    const oppD = parseInt(inputs[3]); // opponent's protein stock
    this.state.setStock(0, oppA, oppB, oppC, oppD);
  }

  #requiredActions() {
    const requiredActions = parseInt(readline());
    this.state.requiredActions = requiredActions;
  }
}
