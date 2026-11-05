// src/TienLen.js

import { Stage } from "boardgame.io/core";
import { Combinations } from "./constants";
import { dealHand } from "./dealHand";
import {
  cardsToCenter,
  passTurn,
  tienLenPlay,
  startNextHand,
  acceptThreePairLead,
  declineThreePairLead,
} from "./moves/cardPlayMoves";
import {
  relocateCards,
  clearStagingArea,
  sortStagingArea,
} from "./moves/cardAreaMoves";
import { normalizeRules } from "./rules";

const TienLen = {
  name: "tien-len",
  setup: setUp,
  validateSetupData: validateSetupData,
  moves: {
    relocateCards: relocateCards,
    clearStagingArea: clearStagingArea,
    cardsToCenter: cardsToCenter,
    passTurn: passTurn,
    tienLenPlay: tienLenPlay,
    sortStagingArea: sortStagingArea,
    startNextHand,
    acceptThreePairLead,
    declineThreePairLead,
  },
  stages: {
    tienLen: { moves: { tienLenPlay } },
    notTurn: {
      moves: { relocateCards, clearStagingArea, sortStagingArea },
    },
    handComplete: { moves: { startNextHand } },
  },
  turn: {
    onBegin: ({ G, events }) => {
      if (G.turnOrder.filter(player => player !== null).length === 1) {
        events.setActivePlayers({
          currentPlayer: { stage: "tienLen" },
          others: { stage: "notTurn" },
        });
      }
    },
    order: {
      first: ({ G }) => G.firstPlayer,
    },
    activePlayers: {
      currentPlayer: { stage: Stage.NULL },
      others: { stage: "notTurn" },
    },
  },
  playerView: playerView,
};

function setUp(ctx, setupData) {
  const random = ctx.random || (ctx.ctx && ctx.ctx.random);
  const validationError = validateSetupData(setupData);
  if (validationError) throw new Error(validationError);
  const rules = normalizeRules(setupData && setupData.rules);
  const { players, firstPlayer, threeSpadesPlayer } = dealHand(
    random,
    rules.openingCard
  );

  return {
    turnOrder: [0, 1, 2, 3],
    center: [],
    centerPlayerID: null,
    players: players,
    roundType: Combinations.ANY,
    winners: [],
    firstPlayer: firstPlayer,
    threeSpadesPlayer: threeSpadesPlayer,
    firstMove: true,
    cardsLeft: { 0: 13, 1: 13, 2: 13, 3: 13 },
    rules: rules,
    netBalances: { 0: 0, 1: 0, 2: 0, 3: 0 },
    handStartBalances: { 0: 0, 1: 0, 2: 0, 3: 0 },
    settlementLog: [],
    handSettlementLogStart: 0,
    handResults: [],
    handNumber: 1,
    handComplete: false,
    previousWinner: null,
    pendingThreePairLeadPlayer: null,
    openingThreePairLeadPlayer: null,
    openingThreePairLeadPenaltyApplied: false,
  };
}

function validateSetupData(setupData) {
  if (
    setupData !== undefined &&
    (setupData === null ||
      typeof setupData !== "object" ||
      Array.isArray(setupData) ||
      Object.keys(setupData).some(key => key !== "rules"))
  ) {
    return "Invalid match setup data.";
  }

  try {
    normalizeRules(setupData && setupData.rules);
  } catch (error) {
    return error.message;
  }
}

export function playerView(G, ctx, playerID) {
  if (G && G.G !== undefined && G.ctx) {
    playerID = G.playerID;
    G = G.G;
  }
  const players = {};
  for (const id of Object.keys(G.players)) {
    const player = G.players[id];
    players[id] =
      id === playerID
        ? player
        : { ...player, hand: [], stagingArea: [] };
  }
  return { ...G, players };
}

export default TienLen;
