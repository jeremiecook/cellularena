import { DIRECTIONS } from "../constants";
import Logger from "../utilities/Logger";

export default class BFS {
  /**
   * @param {State} state - Current game state
   */
  constructor(state) {
    this.state = state;
    this.players = [];
    this.playerToReach = [];
    this.firstToReach = null;
    this.#analyzeState();
  }

  #analyzeState() {
    this.firstToReach = this.#firstToReach();
    //this.players[0] = this.#evaluate(this.state.players[0]);
    //this.players[1] = this.#evaluate(this.state.players[1]);
    //this.difference = this.#calculateDifference(this.players[0], this.players[1]);
    //this.displayGrid(this.difference, "Difference");
  }

  #firstToReach() {
    const queue = [];
    const grid = this.createGrid(this.state.width, this.state.height);

    const organs = this.state.organs;
    for (const [key, organ] of Object.entries(organs)) {
      queue.push({ x: organ.x, y: organ.y, player: organ.owner, distance: 0 });
      grid[organ.y][organ.x] = { first: organ.owner, distance: 0 };
    }
    // Perform BFS
    while (queue.length > 0) {
      const { x, y, player, distance } = queue.shift();

      for (const [dx, dy] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;

        // Skip invalid or out-of-bounds cells
        if (!this.state.getCell(nx, ny) || !this.state.getCell(nx, ny).isFree()) {
          continue;
        }

        const current = grid[ny][nx];

        // Check if the cell is unvisited or can be updated with a shorter distance
        if (current.distance > distance + 1) {
          current.player = player; // Update the first player to reach
          current.distance = distance + 1; // Update the distance
          current.from = { x, y };

          queue.push({ x: nx, y: ny, player, distance: distance + 1 });
        } else if (current.distance === distance + 1 && current.player !== player) {
          current.player = -1;
          current.distance = distance + 1;
        }
      }
    }

    return grid;
  }

  threats(cells = [], blocks = [], depth = 5, player = 1) {
    const opponentId = (player + 1) % 2;
    const opponentCells = this.state.players[opponentId];
    const targets = cells.map((cell) => ({ from: cell.from, ...cell.target }));
    const visited = new Set();
    const queue = [];
    const metCells = [];

    // Add opponent's cells to the queue
    for (const cell of opponentCells) {
      queue.push({ x: cell.x, y: cell.y, distance: 0 });
      visited.add(`${cell.x},${cell.y}`);
    }

    // Convert blocks to a set for quick lookup
    const blockSet = new Set(blocks.map((block) => `${block.x},${block.y}`));

    // BFS traversal
    while (queue.length > 0) {
      const { x, y, distance } = queue.shift();

      // Stop if we exceed the specified depth
      if (distance > depth) continue;

      // Check if this cell is in the `cells` list and has not been met yet
      const indexInCells = targets.findIndex((c) => c.x === x && c.y === y);
      if (indexInCells !== -1) {
        metCells.push(targets[indexInCells]); // Add it to the met targets list
        targets.splice(indexInCells, 1); // Remove from the remaining list
      }

      // Get adjacent targets for BFS
      const adjacentCells = this.state.getCell(x, y).getAdjacentCells();

      for (const adjacent of adjacentCells) {
        const nx = adjacent.x;
        const ny = adjacent.y;

        // Skip already visited cells or blocked cells
        if (visited.has(`${nx},${ny}`) || blockSet.has(`${nx},${ny}`)) continue;

        // Only consider free cells or cells the opponent can pass through
        if (adjacent.isFree(0)) {
          queue.push({ x: nx, y: ny, distance: distance + 1 });
          visited.add(`${nx},${ny}`);
        }
      }
    }
    //return { metCells, visitedCells: [...visited] }; // Return met cells and all visited cells
    //Logger.log("Cells", cells);
    //Logger.log([...visited]);
    return metCells; // Return met cells and all visited cells
  }

  getDistance({ x, y } = {}, player = 1) {
    const target = this.firstToReach[y][x];
    return target.player === player ? target.distance : Infinity;
  }

  /**
   * Simulate the impact of a player's move on the grid.
   * @param {{x: number, y: number}} cell - The target cell.
   * @param {number} playerId - The ID of the player making the move.
   * @returns {number} The number of cells won by this move.
   */
  simulate(cell) {
    const grid = this.copyGrid(this.firstToReach); // Reference to the original grid
    const queue = [{ x: cell.x, y: cell.y, distance: 0 }];
    let advantageGained = 0;

    //if (cell.x === 5 && cell.y === 7) log = true;

    while (queue.length > 0) {
      const { x, y, distance } = queue.shift();
      const adjacentCells = this.state.getCell(x, y).getAdjacentCells();

      for (const adjacent of adjacentCells) {
        if (!adjacent.isFree()) continue;

        const nx = adjacent.x;
        const ny = adjacent.y;

        const current = grid[ny][nx];
        const newDistance = distance + 1;

        // Check if player1 would take control of this cell
        if (newDistance < current.distance) {
          queue.push({ x: nx, y: ny, distance: newDistance });
          current.distance = newDistance;
          if (current.player !== 1) {
            advantageGained++;
            current.player = 1;
          }
        }

        if (newDistance === current.distance && current.player !== 1) {
          advantageGained++;
        }
      }
    }

    return advantageGained;
  }

  /**
   * Creates a grid with default values.
   * @param {number} width - The width of the grid.
   * @param {number} height - The height of the grid.
   * @returns {Array<Array<{firstPlayer: number|null, distance: number}>>} The initialized grid.
   */
  createGrid(width, height) {
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ player: null, distance: Infinity }))
    );
  }

  /**
   * Creates a deep copy of the grid.
   * @param {Array<Array<{firstPlayer: number|null, distance: number}>>} grid - The grid to copy.
   * @returns {Array<Array<{firstPlayer: number|null, distance: number}>>} The copied grid.
   */
  copyGrid(grid) {
    return grid.map((row) => row.map((cell) => ({ ...cell })));
  }

  displayGrid(grid, message = "") {
    const result = grid
      .map(
        (row) =>
          row.map((cell) => (cell.player !== null && cell.player >= 0 ? cell.player : "X")).join("") // Combine the row into a string
      )
      .join("\n"); // Combine all rows with line breaks

    Logger.log(message);
    Logger.log(result);
    Logger.log("--");
  }
}
