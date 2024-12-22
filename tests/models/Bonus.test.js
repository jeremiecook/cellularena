import Bonus from "../../src/models/Bonus";

describe("Bonus", () => {
  test("should create a Bonus instance with specified type, x, and y", () => {
    const bonus = new Bonus("health", 5, 10);

    expect(bonus.type).toBe("health");
    expect(bonus.x).toBe(5);
    expect(bonus.y).toBe(10);
  });

  test("should create a Bonus instance with different type, x, and y values", () => {
    const bonus = new Bonus("speed", 3, 7);

    expect(bonus.type).toBe("speed");
    expect(bonus.x).toBe(3);
    expect(bonus.y).toBe(7);
  });
});
