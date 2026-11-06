// src/App.js

import { Client } from "boardgame.io/react";
import { Debug } from "boardgame.io/debug";
import { default as TienLen } from "./TienLen";
import { default as TienLenBoard } from "./TienLenBoard";
import { SocketIO } from "boardgame.io/multiplayer";

import { getServerUrl } from "./config";

const server = getServerUrl();

const App = Client({
  game: TienLen,
  numPlayers: 4,
  board: TienLenBoard,
  multiplayer: SocketIO({ server }),
  debug: { impl: Debug },
});

export default App;
