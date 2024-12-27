import { DIRECTIONS } from "../constants";
import IO from "../utilities/IO";

export default class BFS {
  /**
   * @param {State} state - Current game state
   */
  constructor(state) {
    this.state = state;
    this.players = [];
    this.#analyzeState();
  }

  #analyzeState() {
    this.players[0] = this.#evaluate(this.state.players[0]);
    this.players[1] = this.#evaluate(this.state.players[1]);
    this.difference = this.#calculateDifference(this.players[0], this.players[1]);
    //this.displayGrid(this.difference, "Difference");
    //console.warn(this.players[1][4][5]);
    //console.warn(this.players[0][4][5]);
  }

  /**
   * Calculate the difference grid between two players.
   * @param {Array<Array<number>>} grid1 - The grid of the first player.
   * @param {Array<Array<number>>} grid2 - The grid of the second player.
   * @returns {Array<Array<number>>} The difference grid.
   */
  #calculateDifference(grid1, grid2) {
    const height = grid1.length;
    const width = grid1[0].length;

    const differenceGrid = new Array(height).fill(0).map(() => new Array(width));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value1 = grid1[y][x];
        const value2 = grid2[y][x];

        // Handle the difference and Infinity cases directly
        differenceGrid[y][x] =
          value1 !== Infinity && value2 !== Infinity ? value1 - value2 : Infinity;
      }
    }

    return differenceGrid;
  }

  #evaluate(player) {
    const queue = [];
    const grid = this.createGrid(this.state.width, this.state.height);

    for (const organ of player) {
      queue.push({ x: organ.x, y: organ.y, distance: 0 });
      grid[organ.y][organ.x] = 0;
    }

    while (queue.length > 0) {
      const { x, y, distance } = queue.shift();

      for (const [dx, dy] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;

        if (this.state.isCellFree(nx, ny)) {
          if (grid[ny][nx] > distance + 1) {
            // Update cell if shorter distance is found
            grid[ny][nx] = distance + 1;

            // Add to queue
            queue.push({ x: nx, y: ny, distance: distance + 1 });
          }
        }
      }
    }

    return grid;
  }

  /**
   * Simulate the impact of a player's move on the grid.
   * @param {{x: number, y: number}} cell - The target cell.
   * @param {number} playerId - The ID of the player making the move.
   * @returns {number} The number of cells won by this move.
   */
  simulate(cell) {
    const player = [...this.state.players[1], cell];

    const newGrid = this.#evaluate(player);

    // Calcule la somme des distances dans chaque grille
    const sumGrid = (grid) =>
      grid.flat().reduce((sum, cell) => sum + (cell !== Infinity ? cell : 0), 0);

    // Retourne la différence entre les deux sommes
    //IO.log("Player: ", sumGrid(newGrid), sumGrid(this.players[1]));
    //return sumGrid(this.players[0]) - sumGrid(newGrid);
    //this.displayGrid(this.#calculateDifference(this.players[1], newGrid));
    return sumGrid(this.players[1]) - sumGrid(newGrid);
  }

  /**
   * Creates a grid with default values.
   * @param {number} width - The width of the grid.
   * @param {number} height - The height of the grid.
   * @returns {Array<Array<{firstPlayer: number|null, distance: number}>>} The initialized grid.
   */
  createGrid(width, height) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => Infinity));
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
        (row) => row.map((cell) => (Math.abs(cell) > 9 ? "+" : Math.abs(cell))).join("") // Combine the row into a string
      )
      .join("\n"); // Combine all rows with line breaks

    IO.log(message);
    IO.log(result);
    IO.log("--");
  }
}
