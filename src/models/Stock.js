export default class Stock {
  constructor(A = 0, B = 0, C = 0, D = 0) {
    this.stock = { A, B, C, D };
    this.costs = {
      BASIC: { A: 1 },
      HARVESTER: { C: 1, D: 1 },
      TENTACLE: { B: 1, C: 1 },
      SPORER: { B: 1, D: 1 },
      ROOT: { A: 1, B: 1, C: 1, D: 1 },
    };
  }

  /**
   * Returns the current stock.
   */
  getStock() {
    return this.stock;
  }

  isSafe() {
    return this.stock.A + this.stock.B + this.stock.C + this.stock.D > 16;
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

    // Calculate the cumulative resource requirements
    const totalCosts = types.reduce((acc, type) => {
      const cost = this.costs[type];
      if (!cost) {
        throw new Error(`Invalid type: ${type}`);
      }
      Object.entries(cost).forEach(([resource, amount]) => {
        acc[resource] = (acc[resource] || 0) + amount;
      });
      return acc;
    }, {});

    // Check if the current stock can satisfy the cumulative requirements
    return Object.entries(totalCosts).every(
      ([resource, totalAmount]) => this.stock[resource] >= totalAmount
    );
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
