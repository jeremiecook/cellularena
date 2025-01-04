export default class Stock {
  constructor(a = 0, b = 0, c = 0, d = 0) {
    this.stock = { a, b, c, d };
    this.costs = {
      BASIC: { a: 1 },
      HARVESTER: { c: 1, d: 1 },
      TENTACLE: { b: 1, c: 1 },
      SPORER: { a: 0, b: 1, c: 0, d: 1 },
      ROOT: { a: 1, b: 1, c: 1, d: 1 },
    };
  }

  /**
   * Returns the current stock.
   */
  getStock() {
    return this.stock;
  }

  /**
   * Checks if there is sufficient stock for the given type.
   * @param {string} type - The type of resource to check.
   * @returns {boolean} True if stock is sufficient, false otherwise.
   */
  hasStockFor(type) {
    const cost = this.costs[type];
    if (!cost) return false;

    return Object.entries(cost).every(([resource, amount]) => this.stock[resource] >= amount);
  }

  /**
   * Checks if there is sufficient stock for all the given types.
   * @param {string[]} types - The types of resources to check.
   * @returns {boolean} True if stock is sufficient for all types, false otherwise.
   */
  hasStockForAll(types) {
    if (!Array.isArray(types)) {
      throw new Error("Invalid input: expected an array of strings");
    }

    return types.every((type) => this.hasStockFor(type));
  }

  /**
   * Spends the required resources for the given type.
   * @param {string} type - The type of resource to spend.
   */
  spend(type) {
    const cost = this.costs[type];
    if (!cost || !this.hasStockFor(type)) return false;

    Object.entries(cost).forEach(([resource, amount]) => {
      this.stock[resource] -= amount;
    });

    return true;
  }
}
