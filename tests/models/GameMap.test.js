import GameMap from "../../src/models/GameMap";
import Cell from "../../src/models/Cell";
import { WALL, FLOOR, BOX } from "../../src/constants";

describe("GameMap", () => {
  let gameMap;

  beforeEach(() => {
    gameMap = new GameMap(3, 3); // Create a 5x5 map

    // .B.
    // ..X
    // BX.

    gameMap.setCell(0, 0, FLOOR);
    gameMap.setCell(1, 0, BOX);
    gameMap.setCell(2, 0, FLOOR);
    gameMap.setCell(0, 1, FLOOR);
    gameMap.setCell(1, 1, FLOOR);
    gameMap.setCell(2, 1, WALL);
    gameMap.setCell(0, 2, BOX);
    gameMap.setCell(1, 2, WALL);
    gameMap.setCell(2, 2, FLOOR);
  });

  test("setCell and getCell should correctly set and retrieve a cell", () => {
    gameMap.setCell(2, 3, FLOOR);
    const cell = gameMap.getCell(2, 3);

    expect(cell).toBeInstanceOf(Cell);
    expect(cell.x).toBe(2);
    expect(cell.y).toBe(3);
    expect(cell.type).toBe(FLOOR);
  });

  //
  // Recherche de cases voisines
  //
  test("neighbors should return valid neighboring cells", () => {
    const neighbors = gameMap.neighbors(1, 1);
    const neighborPositions = neighbors.map((cell) => [cell.x, cell.y]);

    expect(neighborPositions.length === 4);
    expect(neighborPositions).toContainEqual([1, 2]);
    expect(neighborPositions).toContainEqual([1, 0]);
    expect(neighborPositions).toContainEqual([0, 1]);
    expect(neighborPositions).toContainEqual([2, 1]);
  });

  test("neighbors on a border should return 3 neighboring cells", () => {
    const neighbors = gameMap.neighbors(2, 1);
    const neighborPositions = neighbors.map((cell) => [cell.x, cell.y]);

    expect(neighborPositions.length === 3);
    expect(neighborPositions).toContainEqual([2, 0]);
    expect(neighborPositions).toContainEqual([2, 2]);
    expect(neighborPositions).toContainEqual([1, 1]);
  });

  test("neighbors on a corner should return 2 neighboring cells", () => {
    const neighbors = gameMap.neighbors(2, 2);
    const neighborPositions = neighbors.map((cell) => [cell.x, cell.y]);

    expect(neighborPositions.length === 2);
    expect(neighborPositions).toContainEqual([2, 1]);
    expect(neighborPositions).toContainEqual([1, 2]);
  });

  test("reachableCells should return cells within the given distance limit", () => {
    // From 0,0
    const reachableCells = gameMap.reachableCells(0, 0);
    const reachablePositions = Array.from(reachableCells).map((cell) => `${cell.x},${cell.y}`);

    expect(reachablePositions.length).toBe(3);
    expect(reachablePositions).toContain("0,0");
    expect(reachablePositions).toContain("0,1");
    expect(reachablePositions).toContain("1,1");
    expect(reachablePositions).not.toContain("0,2");

    // From a different position
    const reachableCells2 = gameMap.reachableCells(1, 1);
    const reachablePositions2 = Array.from(reachableCells2).map((cell) => `${cell.x},${cell.y}`);

    expect(reachablePositions2.length).toBe(3);
    expect(reachablePositions2).toContain("0,0");
    expect(reachablePositions2).toContain("0,1");
    expect(reachablePositions2).toContain("1,1");
    expect(reachablePositions2).not.toContain("0,2");
  });

  // test("nearbyBoxes should find boxes within the given reach", () => {
  //   gameMap.setCell(1, 1, BOX);
  //   gameMap.setCell(2, 2, BOX);
  //   gameMap.setCell(3, 1, WALL); // Should block any further search in this direction
  //   gameMap.setCell(4, 1, BOX); // Should be unreachable due to the WALL

  //   const nearbyBoxes = gameMap.nearbyBoxes(1, 0, 3); // Check within a reach of 3 cells

  //   expect(nearbyBoxes).toHaveLength(2);
  //   expect(nearbyBoxes.some((cell) => cell.x === 1 && cell.y === 1)).toBe(true);
  //   expect(nearbyBoxes.some((cell) => cell.x === 2 && cell.y === 2)).toBe(true);
  //   expect(nearbyBoxes.some((cell) => cell.x === 4 && cell.y === 1)).toBe(false); // Blocked by WALL
  // });

  // test("display should log the map to the console", () => {
  //   const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

  //   gameMap.setCell(0, 0, FLOOR);
  //   gameMap.setCell(1, 1, WALL);
  //   gameMap.setCell(2, 2, BOX);
  //   gameMap.display();

  //   expect(consoleSpy).toHaveBeenCalledWith("MAP", gameMap.map);
  //   consoleSpy.mockRestore();
  // });
});
