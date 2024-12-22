import { DIRECTIONS } from "../constants";
import IO from "./IO";

export default class ReachableCells {
  /**
   * @param {State} state - Current game state
   */
  constructor(state) {
    this.state = state;
    this.grid = this.createGrid(state.width, state.height); // {firstPlayer: null, distance:Infinity};
    this.#init();
    //IO.log("Grille initiale");
    //this.displayGrid(this.grid);
  }

  /**
   * Simulate the impact of a player's move on the grid.
   * @param {{x: number, y: number}} cell - The target cell.
   * @param {number} playerId - The ID of the player making the move.
   * @returns {number} The number of cells won by this move.
   */
  simulate(cell, playerId = 1) {
    const { x, y } = cell;

    // Create a copy of the grid to avoid modifying the original
    const gridCopy = this.copyGrid(this.grid);
    const queue = [{ x, y, player: playerId, distance: 0 }];
    let cellsWon = 0;

    // Initialize the cell with the new move
    if (
      gridCopy[y][x].firstPlayer !== null &&
      gridCopy[y][x].firstPlayer === playerId &&
      gridCopy[y][x].distance <= 0
    ) {
      return 0; // If the cell is already owned, no cells are "won"
    }

    gridCopy[y][x] = { firstPlayer: playerId, distance: 0 };

    // Perform BFS to simulate the move
    while (queue.length > 0) {
      const { x, y, player, distance } = queue.shift();

      for (const [dx, dy] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;

        if (this.state.isCellFree(nx, ny)) {
          const currentCell = gridCopy[ny]?.[nx];
          if (currentCell && currentCell.distance > distance + 1) {
            // If the current cell is "won" by this move
            if (currentCell.firstPlayer !== player) {
              cellsWon++;
            }

            // Update cell
            currentCell.distance = distance + 1;
            currentCell.firstPlayer = player;

            // Add to queue
            queue.push({ x: nx, y: ny, player, distance: distance + 1 });
          }
        }
      }
    }
    //IO.log("Coup évalué: ", cell);
    //this.displayGrid(gridCopy);
    return cellsWon;
  }

  #init() {
    const players = this.state.players;
    const queue = [];

    players.forEach((player, id) => {
      for (const organ of player) {
        queue.push({ x: organ.x, y: organ.y, player: id, distance: 0 });
        this.grid[organ.y][organ.x] = { firstPlayer: id, distance: 0 };
      }
    });

    while (queue.length > 0) {
      const { x, y, player, distance } = queue.shift();

      for (const [dx, dy] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;

        if (this.state.isCellFree(nx, ny)) {
          const currentCell = this.grid[ny][nx];
          if (currentCell.distance > distance + 1) {
            // Update cell if shorter distance is found
            currentCell.distance = distance + 1;
            currentCell.firstPlayer = player;

            // Add to queue
            queue.push({ x: nx, y: ny, player, distance: distance + 1 });
          }
        }
      }
    }

    //IO.log(grid);
  }

  /**
   * Creates a grid with default values.
   * @param {number} width - The width of the grid.
   * @param {number} height - The height of the grid.
   * @returns {Array<Array<{firstPlayer: number|null, distance: number}>>} The initialized grid.
   */
  createGrid(width, height) {
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ firstPlayer: null, distance: Infinity }))
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

  displayGrid(grid) {
    const result = grid
      .map(
        (row) => row.map((cell) => (cell.firstPlayer !== null ? cell.firstPlayer : ".")).join("") // Combine the row into a string
      )
      .join("\n"); // Combine all rows with line breaks

    IO.log(result);
  }
}
