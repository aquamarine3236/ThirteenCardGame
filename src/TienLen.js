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
  minPlayers: 2,
  maxPlayers: 4,
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
  const roomMode = Boolean(setupData && setupData.roomMode);
  const activePlayerIDs = roomMode
    ? []
    : Array.from({ length: ctx.numPlayers || 4 }, (_, playerID) =>
        String(playerID)
      );
  const dealtHand = roomMode
    ? { players: {}, firstPlayer: null, threeSpadesPlayer: null }
    : dealHand(random, rules.openingCard, activePlayerIDs);
  const players = Array.from({ length: 4 }, (_, playerID) => String(playerID))
    .reduce((allPlayers, playerID) => {
      allPlayers[playerID] = dealtHand.players[playerID] || {
        hand: [],
        stagingArea: [],
      };
      return allPlayers;
    }, {});
  const firstPlayer = roomMode ? 0 : dealtHand.firstPlayer;
  const threeSpadesPlayer = dealtHand.threeSpadesPlayer;
  const startingBalances = activePlayerIDs.reduce((balances, playerID) => {
    balances[playerID] = rules.settlement.baseStake * 100;
    return balances;
  }, {});

  return {
    turnOrder: [0, 1, 2, 3].map(playerID =>
      activePlayerIDs.includes(String(playerID)) ? playerID : null
    ),
    center: [],
    centerPlayerID: null,
    players: players,
    activePlayerIDs: activePlayerIDs,
    started: !roomMode,
    roundType: Combinations.ANY,
    winners: [],
    firstWinnerFinishedWithThreeSpades: false,
    firstPlayer: firstPlayer,
    threeSpadesPlayer: threeSpadesPlayer,
    firstMove: true,
    cardsLeft: Object.keys(players).reduce((cardsLeft, playerID) => {
      cardsLeft[playerID] = players[playerID].hand.length;
      return cardsLeft;
    }, {}),
    rules: rules,
    netBalances: startingBalances,
    handStartBalances: { ...startingBalances },
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
      Object.keys(setupData).some(key => !["rules", "roomMode"].includes(key)) ||
      (setupData.roomMode !== undefined &&
        typeof setupData.roomMode !== "boolean"))
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
      id === playerID &&
      (!Array.isArray(G.activePlayerIDs) ||
        G.activePlayerIDs.includes(String(playerID)))
        ? player
        : { ...player, hand: [], stagingArea: [] };
  }
  return { ...G, players };
}

export default TienLen;
