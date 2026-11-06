// server.js

import { Server, Origins } from "boardgame.io/server";
import serve from "koa-static";
import path from "path";
import crypto from "crypto";
import koaBody from "koa-body";
import { default as TienLen } from "./src/TienLen";
import { dealHand } from "./src/dealHand";
import { Combinations } from "./src/constants";

const PORT = process.env.PORT || 8000;

const extraOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const server = Server({
  games: [TienLen],
  // LOCALHOST_IN_DEVELOPMENT allows CRA (:3000) → API (:8000) in local dev.
  // Same-origin production deploys do not need CORS; set CORS_ORIGIN for split hosts.
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT, ...extraOrigins],
});

function secureRandom() {
  return {
    Die(sides) {
      return crypto.randomInt(1, sides + 1);
    },
    Shuffle(items) {
      const shuffled = items.slice();
      for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = crypto.randomInt(index + 1);
        [shuffled[index], shuffled[swapIndex]] = [
          shuffled[swapIndex],
          shuffled[index],
        ];
      }
      return shuffled;
    },
  };
}

function isRoomOwner(metadata, playerID, credentials) {
  return (
    String(playerID) === "0" &&
    metadata.ownerCredentials &&
    metadata.players["0"] &&
    metadata.players["0"].name &&
    metadata.players["0"].credentials === credentials &&
    metadata.ownerCredentials === credentials
  );
}

function removeOwnerCredential(match) {
  if (match && typeof match === "object") {
    delete match.ownerCredentials;
  }
}

server.app.use(async (ctx, next) => {
  const isMatchRoute =
    ctx.path.startsWith(`/games/${TienLen.name}/`) &&
    ctx.method === "POST" &&
    ctx.path.endsWith("/join");
  if (isMatchRoute) {
    const matchID = ctx.path.split("/")[3];
    const { metadata } = await server.db.fetch(matchID, { metadata: true });
    if (metadata && metadata.started) {
      ctx.throw(409, "This room has already started.");
    }
  }

  await next();

  if (
    ctx.method === "POST" &&
    ctx.path.endsWith("/join") &&
    ctx.request.body &&
    String(ctx.request.body.playerID) === "0" &&
    ctx.body &&
    ctx.body.playerCredentials
  ) {
    const matchID = ctx.path.split("/")[3];
    const { metadata } = await server.db.fetch(matchID, { metadata: true });
    if (metadata && !metadata.ownerCredentials) {
      metadata.ownerCredentials = ctx.body.playerCredentials;
      await server.db.setMetadata(matchID, metadata);
    }
  }

  if (ctx.method === "GET" && ctx.body) {
    if (Array.isArray(ctx.body.matches)) {
      ctx.body.matches.forEach(removeOwnerCredential);
    } else {
      removeOwnerCredential(ctx.body);
    }
  }
});

/**
 * Delete a room while it is waiting. Only its original creator may delete it.
 */
server.router.post("/games/:name/:id/delete", koaBody(), async ctx => {
  const gameName = ctx.params.name;
  const matchID = ctx.params.id;
  const playerID = ctx.request.body && ctx.request.body.playerID;
  const credentials = ctx.request.body && ctx.request.body.credentials;

  if (gameName !== TienLen.name) {
    ctx.throw(404, "Game " + gameName + " not found");
  }
  const { metadata } = await server.db.fetch(matchID, { metadata: true });
  if (!metadata) {
    ctx.throw(404, "Match " + matchID + " not found");
  }
  if (!isRoomOwner(metadata, playerID, credentials)) {
    ctx.throw(403, "Only the room creator may delete this room.");
  }
  if (metadata.started) {
    ctx.throw(409, "A room cannot be deleted after the game has started.");
  }

  await server.db.wipe(matchID);
  ctx.body = {};
});

server.router.post("/games/:name/:id/start", koaBody(), async ctx => {
  const { name: gameName, id: matchID } = ctx.params;
  const { playerID, credentials } = ctx.request.body || {};
  if (gameName !== TienLen.name) {
    ctx.throw(404, "Game " + gameName + " not found");
  }

  const storedMatch = await server.db.fetch(matchID, {
    metadata: true,
    state: true,
  });
  const metadata =
    storedMatch.metadata && JSON.parse(JSON.stringify(storedMatch.metadata));
  const state =
    storedMatch.state && JSON.parse(JSON.stringify(storedMatch.state));
  if (!metadata || !state) {
    ctx.throw(404, "Match " + matchID + " not found");
  }
  if (!isRoomOwner(metadata, playerID, credentials)) {
    ctx.throw(403, "Only the room creator may start this game.");
  }
  if (metadata.started || state.G.started) {
    ctx.throw(409, "This game has already started.");
  }

  const activePlayerIDs = Object.keys(metadata.players)
    .filter(id => metadata.players[id].name)
    .sort((left, right) => Number(left) - Number(right));
  if (activePlayerIDs.length < 2) {
    ctx.throw(409, "At least two players must join before the game starts.");
  }

  const rules = state.G.rules;
  const {
    players: dealtPlayers,
    firstPlayer,
    threeSpadesPlayer,
  } = dealHand(secureRandom(), rules.openingCard, activePlayerIDs);
  state.G.players = Object.keys(metadata.players).reduce((players, id) => {
    players[id] = dealtPlayers[id] || { hand: [], stagingArea: [] };
    return players;
  }, {});
  state.G.activePlayerIDs = activePlayerIDs;
  state.G.started = true;
  state.G.turnOrder = [0, 1, 2, 3].map(id =>
    activePlayerIDs.includes(String(id)) ? id : null
  );
  state.G.firstPlayer = firstPlayer;
  state.G.threeSpadesPlayer = threeSpadesPlayer;
  state.G.firstMove = true;
  state.G.center = [];
  state.G.centerPlayerID = null;
  state.G.roundType = Combinations.ANY;
  state.G.winners = [];
  state.G.cardsLeft = Object.keys(state.G.players).reduce(
    (cardsLeft, id) => {
      cardsLeft[id] = state.G.players[id].hand.length;
      return cardsLeft;
    },
    {}
  );
  state.G.netBalances = activePlayerIDs.reduce((balances, id) => {
    balances[id] = rules.settlement.baseStake * 100;
    return balances;
  }, {});
  state.G.handStartBalances = { ...state.G.netBalances };
  state.G.settlementLog = [];
  state.G.handSettlementLogStart = 0;
  state.G.handResults = [];
  state.G.handNumber = 1;
  state.G.handComplete = false;
  state.G.previousWinner = null;
  state.G.pendingThreePairLeadPlayer = null;
  state.G.openingThreePairLeadPlayer = null;
  state.G.openingThreePairLeadPenaltyApplied = false;

  state.ctx.currentPlayer = String(firstPlayer);
  state.ctx.playOrderPos = state.ctx.playOrder.indexOf(String(firstPlayer));
  state.ctx.activePlayers = Object.keys(state.G.players).reduce(
    (activePlayers, id) => {
      activePlayers[id] = id === String(firstPlayer) ? null : "notTurn";
      return activePlayers;
    },
    {}
  );
  state._stateID += 1;
  metadata.started = true;
  metadata.startedAt = Date.now();

  await server.db.setState(matchID, state);
  await server.db.setMetadata(matchID, metadata);
  ctx.body = { started: true };
});

// Build path relative to the server.js file
const frontEndAppBuildPath = path.resolve(__dirname, "./build");
server.app.use(serve(frontEndAppBuildPath));

// Register SPA fallback after run() mounts the Lobby API router, so /games/*
// is not swallowed by index.html.
server.run(PORT, () => {
  server.app.use(async (ctx, next) => {
    await serve(frontEndAppBuildPath)(
      Object.assign(ctx, { path: "index.html" }),
      next
    );
  });
});
