import Cell from "../../src/models/Cell";

describe("Cell", () => {
  test("should create a Cell instance with specified x, y, type, distance, and score", () => {
    const cell = new Cell(1, 2, 5, 10, 20);

    expect(cell.x).toBe(1);
    expect(cell.y).toBe(2);
    expect(cell.type).toBe(5);
    expect(cell.distance).toBe(10);
    expect(cell.score).toBe(20);
  });

  test("should create a Cell instance with default type, distance, and score", () => {
    const cell = new Cell(1, 2);

    expect(cell.x).toBe(1);
    expect(cell.y).toBe(2);
    expect(cell.type).toBe(3); // Default type
    expect(cell.distance).toBe(Infinity); // Default distance
    expect(cell.score).toBe(0); // Default score
  });
});
