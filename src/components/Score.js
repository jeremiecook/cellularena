export default class Score {
  constructor(state) {
    this.state = state;
  }

  surfacePerPlayer() {
    const surfaceRatio = this.state.players[1].length / this.state.players[0].length;
    return surfaceRatio;
  }

  bfs() {}

  calculateScore() {
    const me = this.state.me;
    const opponent = this.state.opponent;

    // Initialisation des résultats
    const result = Array.from({ length: rows }, () => Array(cols).fill(null));
    const reachTime = Array.from({ length: rows }, () => Array(cols).fill(Infinity));

    function bfs(queue, player) {
      while (queue.length > 0) {
        const [x, y, time] = queue.shift();

        for (const [dx, dy] of DIRECTIONS) {
          // Nouvelle position
          const nx = x + dx;
          const ny = y + dy;

          if (this.state.isCellFree(nx, ny)) {
            if (reachTime[nx][ny] > time + 1) {
              // First time this cell is reached
              reachTime[nx][ny] = time + 1;
              result[nx][ny] = player;
              queue.push([nx, ny, time + 1]);
            } else if (reachTime[nx][ny] === time + 1 && result[nx][ny] !== player) {
              // Cell is reached at the same time by another player
              result[nx][ny] = null; // Unmark the cell
            }
          }
        }
      }
    }
  }
}
