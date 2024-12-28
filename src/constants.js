export const DIRECTIONS = [
  [0, 1, "S"],
  [1, 0, "E"],
  [0, -1, "N"],
  [-1, 0, "W"],
];

export const TYPE = {
  FREE: "FREE",
  WALL: "WALL",
  ORGAN: {
    ROOT: "ROOT",
    BASIC: "BASIC",
    HARVESTER: "HARVESTER",
    TENTACLE: "TENTACLE",
    SPORER: "SPORER",
  },
  PROTEIN: {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
  },
};
