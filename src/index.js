// TODO

import State from "./models/State";
import IO from "./components/IO";
import AI from "./components/AI";

const state = new State();
const io = new IO(state);
const ai = new AI();

while (true) {
  state.reset();
  io.read();
  ai.next(state);
}
