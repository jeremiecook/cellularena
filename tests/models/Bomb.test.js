import Bomb from "../../src/models/Bomb";

describe("Bomb", () => {
  test("should create a Bomb instance with specified owner, x, y, timer, and reach", () => {
    const bomb = new Bomb("player1", 4, 5, 10, 3);

    expect(bomb.owner).toBe("player1");
    expect(bomb.x).toBe(4);
    expect(bomb.y).toBe(5);
    expect(bomb.timer).toBe(10);
    expect(bomb.reach).toBe(3);
  });

  test("should create a Bomb instance with different values for owner, x, y, timer, and reach", () => {
    const bomb = new Bomb("enemy", 1, 2, 5, 2);

    expect(bomb.owner).toBe("enemy");
    expect(bomb.x).toBe(1);
    expect(bomb.y).toBe(2);
    expect(bomb.timer).toBe(5);
    expect(bomb.reach).toBe(2);
  });
});
