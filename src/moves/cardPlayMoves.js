import { INVALID_MOVE } from "boardgame.io/core";
import { Combinations, Ranks } from "../constants";
import {
  DEFAULT_RULES,
  FAILED_THREE_PAIR_LEAD_MULTIPLIER,
  WHITE_WIN_MULTIPLIER,
  openingCardLabel,
} from "../rules";
import { dealHand } from "../dealHand";
import {
  validCombination,
  validChop,
  compareHighest,
  compareCards,
  chopStrength,
} from "./helper-functions/cardComparison";
import { unpackMove } from "./moveContext";
const _ = require("lodash");

export function validPlay(
  stagingArea,
  roundType,
  center,
  requiredOpeningCard,
  rules = DEFAULT_RULES,
  isFinalPlay = false
) {
  const handType = validCombination(stagingArea);
  if (stagingArea.length === 0 || handType === undefined) {
    return "Invalid Combination";
  }
  if (
    requiredOpeningCard &&
    !stagingArea.some(
      card =>
        card.rank === requiredOpeningCard.rank &&
        card.suit === requiredOpeningCard.suit
    )
  ) {
    return `First Play Must Include ${openingCardLabel(requiredOpeningCard)}`;
  }
  if (
    isFinalPlay &&
    !rules.allowTwoAsLastCard &&
    stagingArea.some(card => card.rank === "2")
  ) {
    return "Cannot Finish With a 2";
  }
  if (roundType === Combinations.ANY || validChop(center, stagingArea, rules)) {
    return true;
  }
  if (roundType !== handType || stagingArea.length !== center.length) {
    return "Does Not Match Center";
  }
  if (compareHighest(stagingArea, center) !== 1) {
    return "Does Not Beat Center";
  }
  return true;
}

export function tienLenPlay(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  if (
    G.started === false ||
    G.handComplete ||
    G.pendingThreePairLeadPlayer ||
    isTurnExpired(G) ||
    ctx.activePlayers &&
    ctx.activePlayers[ctx.currentPlayer] !== "tienLen"
  ) {
    return INVALID_MOVE;
  }
  const player = G.players[ctx.currentPlayer];
  if (!player) return INVALID_MOVE;
  const rules = G.rules || DEFAULT_RULES;
  const requiredOpeningCard = G.firstMove ? rules.openingCard : null;
  const cards = player.stagingArea;
  if (
    cards.length === 0 ||
    validCombination(cards) === undefined ||
    (requiredOpeningCard &&
      !cards.some(
        card =>
          card.rank === requiredOpeningCard.rank &&
          card.suit === requiredOpeningCard.suit
      ))
  ) {
    return INVALID_MOVE;
  }
  return playStagingArea(G, ctx, true);
}

export function cardsToCenter(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  if (
    G.started === false ||
    G.handComplete ||
    G.pendingThreePairLeadPlayer ||
    isTurnExpired(G) ||
    ctx.activePlayers &&
    ["tienLen", "leadChoice"].includes(
      ctx.activePlayers[ctx.currentPlayer]
    )
  ) {
    return INVALID_MOVE;
  }
  const player = G.players[ctx.currentPlayer];
  if (!player) return INVALID_MOVE;
  const rules = G.rules || DEFAULT_RULES;
  const requiredOpeningCard = G.firstMove ? rules.openingCard : null;
  if (
    validPlay(
      player.stagingArea,
      G.roundType,
      G.center,
      requiredOpeningCard,
      rules,
      G.cardsLeft[ctx.currentPlayer] === player.stagingArea.length
    ) !== true
  ) {
    return INVALID_MOVE;
  }
  return playStagingArea(G, ctx, false);
}

function playStagingArea(G, ctx, isFreePlay) {
  const currentPlayer = ctx.currentPlayer;
  const player = G.players[currentPlayer];
  const rules = G.rules || DEFAULT_RULES;
  const cards = player.stagingArea;
  const handType = validCombination(cards);
  const choppedPlayer = G.centerPlayerID;
  const chop = validChop(G.center, cards, rules);
  const isStrongerSameTypeResponse =
    G.chopChain &&
    chopStrength(handType) > 0 &&
    handType === G.roundType &&
    cards.length === G.center.length &&
    compareHighest(cards, G.center) === 1;
  const isChopChainResponse = chop || isStrongerSameTypeResponse;
  const cutRound = shouldCutRound(handType, rules);
  const continuesFreePlay =
    isFreePlay &&
    (chop ||
      (handType === G.roundType &&
        cards.length === G.center.length &&
        compareHighest(cards, G.center) === 1));

  if (
    !isActivePlayer(G, currentPlayer) ||
    cards.length === 0 ||
    handType === undefined ||
    !Number.isInteger(G.cardsLeft[currentPlayer]) ||
    G.cardsLeft[currentPlayer] < cards.length ||
    (!rules.allowTwoAsLastCard &&
      G.cardsLeft[currentPlayer] === cards.length &&
      cards.some(card => card.rank === "2"))
  ) {
    return INVALID_MOVE;
  }

  if (
    isFreePlay &&
    (!continuesFreePlay || (chop && cutRound))
  ) {
    ctx.events.setStage("notTurn");
  }
  if (isFreePlay && !continuesFreePlay) {
    settleChopChain(G);
  }
  if (isFreePlay && !continuesFreePlay) {
    G.turnOrder = makeTurnOrder(G, true);
  }
  if (G.openingThreePairLeadPlayer && (chop || (isFreePlay && !continuesFreePlay))) {
    G.openingThreePairLeadPlayer = null;
    G.openingThreePairLeadPenaltyApplied = false;
  }

  if (isChopChainResponse && choppedPlayer !== undefined) {
    const strength = chopStrength(handType);
    if (!G.chopChain) {
      G.chopChain = {
        amount: G.twoCardPot || twoCardValue(G.center, rules),
        payer: choppedPlayer,
        recipient: currentPlayer,
        multiplier: 1,
        strength,
        overchops: 0,
        type: `chop-${getChopKey(G.center, handType)}`,
      };
    } else {
      const higherSameStrengthChop =
        strength === G.chopChain.strength &&
        handType === G.roundType &&
        compareHighest(cards, G.center) === 1;
      if (strength > G.chopChain.strength || higherSameStrengthChop) {
        G.chopChain.multiplier *= 2;
        G.chopChain.overchops += 1;
      }
      G.chopChain.strength = Math.max(G.chopChain.strength, strength);
      G.chopChain.payer = choppedPlayer;
      G.chopChain.recipient = currentPlayer;
    }
  }

  if (cards.every(card => card.rank === "2")) {
    const centerIsTwoSet =
      G.center.length > 0 && G.center.every(card => card.rank === "2");
    G.twoCardPot =
      (centerIsTwoSet ? G.twoCardPot : 0) + twoCardValue(cards, rules);
  } else if (isChopChainResponse) {
    G.twoCardPot = 0;
  } else {
    G.twoCardPot = 0;
  }

  if (
    G.openingThreePairLeadPlayer &&
    G.openingThreePairLeadPlayer === choppedPlayer &&
    !G.openingThreePairLeadPenaltyApplied &&
    currentPlayer !== choppedPlayer &&
    handType === Combinations.THREEPAIR &&
    G.roundType === Combinations.THREEPAIR &&
    compareHighest(cards, G.center) === 1
  ) {
    const penalty =
      rules.settlement.baseStake * FAILED_THREE_PAIR_LEAD_MULTIPLIER;
    if (penalty > 0) {
      transfer(
        G,
        choppedPlayer,
        currentPlayer,
        penalty,
        "failed-three-pair-lead"
      );
    }
    G.openingThreePairLeadPenaltyApplied = true;
    G.openingThreePairLeadPlayer = null;
  }

  G.roundType = handType;
  G.center = _.cloneDeep(cards).sort(compareCards);
  G.centerPlayerID = currentPlayer;
  player.stagingArea = [];
  G.cardsLeft[currentPlayer] -= cards.length;
  G.firstMove = false;

  if (G.cardsLeft[currentPlayer] === 0) {
    G.winners.push(currentPlayer);
    if (G.winners.length === 1) {
      G.firstWinnerFinishedWithThreeSpades =
        cards.length === 1 &&
        cards[0].rank === "3" &&
        cards[0].suit === "S";
    }
    G.turnOrder = G.turnOrder.map(x => (x === "W" ? null : x));
    G.turnOrder[parseInt(currentPlayer, 10)] = "W";
  }

  if (chop && cutRound) {
    G.openingThreePairLeadPlayer = null;
    G.openingThreePairLeadPenaltyApplied = false;
    G.turnOrder = makeTurnOrder(G, true);
  }

  if (
    G.winners.length >= getActivePlayerIDs(G).length - 1 &&
    !G.handComplete
  ) {
    settleGame(G, rules);
    ctx.events.setActivePlayers({ all: "handComplete" });
    return;
  }

  nextTurn(G, ctx);
}

export function passTurn(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  if (
    G.handComplete ||
    G.pendingThreePairLeadPlayer ||
    isTurnExpired(G) ||
    ctx.activePlayers &&
    ctx.activePlayers[ctx.currentPlayer] === "tienLen"
  ) {
    return INVALID_MOVE;
  }
  return applyPassTurn(G, ctx);
}

export function timeoutTurn(contextOrG, legacyContext, ...legacyArgs) {
  const { G, ctx, args } = unpackMove(
    contextOrG,
    legacyContext,
    ...legacyArgs
  );
  const [expectedTurn, expectedDeadline] = args;
  if (
    G.handComplete ||
    !isTurnExpired(G) ||
    expectedTurn !== ctx.turn ||
    expectedDeadline !== G.turnDeadlineAt ||
    !G.players[ctx.currentPlayer] ||
    !isActivePlayer(G, ctx.currentPlayer)
  ) {
    return INVALID_MOVE;
  }

  if (G.pendingThreePairLeadPlayer === ctx.currentPlayer) {
    return declineThreePairLeadState(G, ctx);
  }

  if (ctx.activePlayers && ctx.activePlayers[ctx.currentPlayer] === "tienLen") {
    settleChopChain(G);
    G.turnOrder = makeTurnOrder(G, true);
    G.roundType = Combinations.ANY;
    G.center = [];
    G.centerPlayerID = null;
    G.twoCardPot = 0;
    G.openingThreePairLeadPlayer = null;
    G.openingThreePairLeadPenaltyApplied = false;
    nextTurn(G, ctx);
    return;
  }

  return applyPassTurn(G, ctx);
}

function applyPassTurn(G, ctx) {
  const playerIndex = parseInt(ctx.currentPlayer, 10);
  if (
    !G.players[ctx.currentPlayer] ||
    !isActivePlayer(G, ctx.currentPlayer) ||
    !Number.isInteger(playerIndex)
  ) {
    return INVALID_MOVE;
  }
  G.turnOrder[playerIndex] = null;
  if (
    G.openingThreePairLeadPlayer &&
    G.turnOrder.filter(player => player !== null).length === 1
  ) {
    G.openingThreePairLeadPlayer = null;
    G.openingThreePairLeadPenaltyApplied = false;
  }
  nextTurn(G, ctx, false);
}

export function startNextHand(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  const random = ctx.random || (ctx.ctx && ctx.ctx.random);
  if (
    G.started === false ||
    !G.handComplete ||
    !G.previousWinner ||
    !random ||
    typeof random.Shuffle !== "function" ||
    typeof random.Die !== "function"
  ) {
    return INVALID_MOVE;
  }

  const previousWinner = G.previousWinner;
  const activePlayerIDs = getActivePlayerIDs(G);
  const { players: dealtPlayers, threeSpadesPlayer } = dealHand(
    random,
    G.rules.openingCard,
    activePlayerIDs
  );
  const players = activePlayerIDs.reduce((allPlayers, playerID) => {
    allPlayers[playerID] = dealtPlayers[playerID];
    return allPlayers;
  }, {});
  const allPlayerIDs = Object.keys(G.players);
  for (const playerID of allPlayerIDs) {
    if (!players[playerID]) players[playerID] = { hand: [], stagingArea: [] };
  }
  const leadCandidate = G.rules.chops.threePairLead
    ? findThreePairLeadCandidate(players, Number(previousWinner))
    : null;

  G.handNumber += 1;
  G.players = players;
  G.cardsLeft = Object.keys(G.players).reduce((cardsLeft, playerID) => {
    cardsLeft[playerID] = G.players[playerID].hand.length;
    return cardsLeft;
  }, {});
  G.center = [];
  G.centerPlayerID = null;
  G.roundType = Combinations.ANY;
  G.winners = [];
  G.firstWinnerFinishedWithThreeSpades = false;
  G.firstPlayer = Number(previousWinner);
  G.threeSpadesPlayer = threeSpadesPlayer;
  G.firstMove = false;
  G.turnOrder = makeTurnOrder(G);
  G.handComplete = false;
  G.gameResults = null;
  G.handStartBalances = { ...G.netBalances };
  G.handSettlementLogStart = G.settlementLog.length;
  G.pendingThreePairLeadPlayer = leadCandidate;
  G.openingThreePairLeadPlayer = null;
  G.openingThreePairLeadPenaltyApplied = false;
  G.chopChain = null;
  G.twoCardPot = 0;

  ctx.events.endTurn({ next: leadCandidate || previousWinner });
}

export function acceptThreePairLead(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  const playerID = ctx.currentPlayer;
  if (
    G.started === false ||
    G.handComplete ||
    G.pendingThreePairLeadPlayer !== playerID ||
    isTurnExpired(G) ||
    !G.players[playerID] ||
    !isActivePlayer(G, playerID)
  ) {
    return INVALID_MOVE;
  }

  const cards = findSmallestThreePair(G.players[playerID].hand);
  if (!cards) return INVALID_MOVE;

  G.players[playerID].hand = G.players[playerID].hand.filter(
    card => !cards.some(selected => _.isEqual(selected, card))
  );
  G.cardsLeft[playerID] -= cards.length;
  G.center = cards;
  G.centerPlayerID = playerID;
  G.roundType = Combinations.THREEPAIR;
  G.firstPlayer = Number(playerID);
  G.firstMove = false;
  G.turnOrder = makeTurnOrder(G);
  G.pendingThreePairLeadPlayer = null;
  G.openingThreePairLeadPlayer = playerID;
  G.openingThreePairLeadPenaltyApplied = false;

  ctx.events.endTurn({
    next: findNextPlayer(G.turnOrder, Number(playerID)),
  });
}

export function declineThreePairLead(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  if (isTurnExpired(G)) return INVALID_MOVE;
  return declineThreePairLeadState(G, ctx);
}

function declineThreePairLeadState(G, ctx) {
  const playerID = ctx.currentPlayer;
  if (
    G.started === false ||
    G.handComplete ||
    G.pendingThreePairLeadPlayer !== playerID ||
    !G.previousWinner ||
    !isActivePlayer(G, playerID)
  ) {
    return INVALID_MOVE;
  }

  G.pendingThreePairLeadPlayer = null;
  G.firstPlayer = Number(G.previousWinner);
  ctx.events.endTurn({ next: G.previousWinner });
}

function nextTurn(G, ctx) {
  let currentPlayer = parseInt(ctx.currentPlayer, 10);
  let nextPlayer = findNextPlayer(G.turnOrder, currentPlayer);
  let activeSlots = G.turnOrder.filter(x => x !== null);
  if (nextPlayer === "W" && activeSlots.length !== 1) {
    G.turnOrder = G.turnOrder.map(x => (x === "W" ? null : x));
    nextPlayer = findNextPlayer(G.turnOrder, currentPlayer);
    activeSlots = G.turnOrder.filter(x => x !== null);
  } else if (nextPlayer === "W" && activeSlots.length === 1) {
    settleChopChain(G);
    G.turnOrder = makeTurnOrder(G, true);
    G.roundType = Combinations.ANY;
    G.center = [];
    G.centerPlayerID = null;
    G.twoCardPot = 0;
    G.openingThreePairLeadPlayer = null;
    G.openingThreePairLeadPenaltyApplied = false;
    currentPlayer = parseInt(G.winners[G.winners.length - 1], 10);
    nextPlayer = findNextPlayer(G.turnOrder, currentPlayer);
    activeSlots = G.turnOrder.filter(x => x !== null);
  }

  const playersStillInRound = G.turnOrder.filter(
    player => player !== null && player !== "W"
  );
  if (playersStillInRound.length === 0) {
    settleChopChain(G);
    const previousCenterPlayer =
      G.centerPlayerID === null
        ? currentPlayer
        : parseInt(G.centerPlayerID, 10);
    G.turnOrder = makeTurnOrder(G, true);
    G.roundType = Combinations.ANY;
    G.center = [];
    G.centerPlayerID = null;
    G.twoCardPot = 0;
    G.openingThreePairLeadPlayer = null;
    G.openingThreePairLeadPenaltyApplied = false;
    nextPlayer = findNextPlayer(G.turnOrder, previousCenterPlayer);
  } else if (
    playersStillInRound.length === 1 &&
    String(playersStillInRound[0]) === String(G.centerPlayerID)
  ) {
    settleChopChain(G);
    G.twoCardPot = 0;
  }

  ctx.events.endTurn({ next: nextPlayer });
}

function findNextPlayer(turnOrder, currentPlayer) {
  const playerList = turnOrder
    .slice(currentPlayer + 1)
    .concat(turnOrder.slice(0, currentPlayer + 1));
  const next = playerList.find(i => i !== null);
  return next === undefined ? String(currentPlayer) : next.toString();
}

function getActivePlayerIDs(G) {
  return Array.isArray(G.activePlayerIDs)
    ? G.activePlayerIDs.map(String)
    : Object.keys(G.players);
}

function isActivePlayer(G, playerID) {
  return getActivePlayerIDs(G).includes(String(playerID));
}

function makeTurnOrder(G, excludeWinners = false) {
  const activePlayerIDs = getActivePlayerIDs(G);
  return Array.from({ length: 4 }, (_, playerID) => {
    const id = String(playerID);
    if (!activePlayerIDs.includes(id)) return null;
    if (excludeWinners && G.winners.includes(id)) return null;
    return playerID;
  });
}

function getChopKey(center, combo) {
  if (center.length === 2) {
    return combo === Combinations.FOUROFAKIND
      ? "fourKindPairTwo"
      : "fourPairPairTwo";
  }
  if (combo === Combinations.THREEPAIR) return "threePairSingleTwo";
  if (combo === Combinations.FOUROFAKIND) return "fourKindSingleTwo";
  return "fourPairSingleTwo";
}

function shouldCutRound(combo, rules) {
  return (
    (combo === Combinations.FOUROFAKIND && rules.chops.fourKindCutRound) ||
    (combo === Combinations.FOURPAIR && rules.chops.fourPairCutRound)
  );
}

function twoCardValue(cards, rules) {
  return cards.reduce(
    (amount, card) =>
      amount +
      (card.rank === "2"
        ? rules.settlement.baseStake *
          rules.settlement.twoCardMultipliers[card.suit]
        : 0),
    0
  );
}

function transfer(G, from, to, amount, type) {
  G.netBalances[from] -= amount;
  G.netBalances[to] += amount;
  G.settlementLog.push({ type, from, to, amount, handNumber: G.handNumber });
}

function isTurnExpired(G) {
  return Number.isFinite(G.turnDeadlineAt) && Date.now() >= G.turnDeadlineAt;
}

function settleChopChain(G) {
  const chain = G.chopChain;
  if (!chain) return;
  G.chopChain = null;
  G.twoCardPot = 0;

  const amount = chain.amount * chain.multiplier;
  if (amount > 0 && chain.payer !== chain.recipient) {
    transfer(G, chain.payer, chain.recipient, amount, chain.type);
    const settlement = G.settlementLog[G.settlementLog.length - 1];
    settlement.multiplier = chain.multiplier;
    settlement.overchops = chain.overchops;
  }
}

function settleGame(G, rules) {
  settleChopChain(G);
  const activePlayerIDs = getActivePlayerIDs(G);
  const rankings = G.winners.concat(
    activePlayerIDs.filter(playerID => !G.winners.includes(playerID))
  );
  const { settlement } = rules;
  const whiteWin =
    rules.threeSpadesFirstPlaceWhiteWin &&
    G.firstWinnerFinishedWithThreeSpades;
  const whiteWinMultiplier = whiteWin ? WHITE_WIN_MULTIPLIER : 1;
  let payouts;
  if (settlement.mode === "winner-vs-others") {
    payouts = [activePlayerIDs.length - 1].concat(
      Array(activePlayerIDs.length - 1).fill(-1)
    );
  } else {
    payouts = getBalancedRankPayouts(settlement.rankPayouts, rankings.length);
  }

  rankings.forEach((playerID, rank) => {
    const amount =
      payouts[rank] * settlement.baseStake * whiteWinMultiplier;
    G.netBalances[playerID] += amount;
    if (amount !== 0) {
      G.settlementLog.push({
        type: "ranking",
        playerID,
        rank: rank + 1,
        amount,
        handNumber: G.handNumber,
      });
    }
  });

  const winner = rankings[0];
  for (const playerID of rankings.slice(1)) {
    const twos = G.players[playerID].hand.filter(card => card.rank === "2");
    const amount = twoCardValue(twos, rules);
    if (amount > 0) {
      transfer(G, playerID, winner, amount, "thoi-two");
    }
  }

  const handBalances = activePlayerIDs.reduce((balances, playerID) => {
    balances[playerID] =
      G.netBalances[playerID] - G.handStartBalances[playerID];
    return balances;
  }, {});
  const handResult = {
    handNumber: G.handNumber,
    rankings,
    whiteWin,
    netBalances: handBalances,
    cumulativeBalances: { ...G.netBalances },
    settlementLog: G.settlementLog.slice(G.handSettlementLogStart),
  };
  G.gameResults = handResult;
  G.handResults.push(handResult);
  G.previousWinner = rankings[0];
  G.handComplete = true;
}

function getBalancedRankPayouts(configuredPayouts, playerCount) {
  const payouts = configuredPayouts.slice(0, playerCount);
  const average = Math.trunc(
    payouts.reduce((sum, amount) => sum + amount, 0) / playerCount
  );
  let remainder = payouts.reduce((sum, amount) => sum + amount, 0) -
    average * playerCount;
  for (let index = 0; index < payouts.length; index++) {
    payouts[index] -= average;
  }
  for (let index = payouts.length - 1; remainder !== 0; index--) {
    const adjustment = Math.sign(remainder);
    payouts[index] -= adjustment;
    remainder -= adjustment;
    if (index === 0) index = payouts.length;
  }
  return payouts;
}

function findThreePairLeadCandidate(players, startingPlayer) {
  let bestCandidate = null;
  for (const playerID of Object.keys(players)) {
    const cards = findSmallestThreePair(players[playerID].hand);
    if (!cards) continue;

    const candidate = { playerID, cards };
    if (
      !bestCandidate ||
      compareHighest(cards, bestCandidate.cards) < 0 ||
      (compareHighest(cards, bestCandidate.cards) === 0 &&
        clockwiseDistance(playerID, startingPlayer) <
          clockwiseDistance(bestCandidate.playerID, startingPlayer))
    ) {
      bestCandidate = candidate;
    }
  }
  return bestCandidate ? bestCandidate.playerID : null;
}

function findSmallestThreePair(hand) {
  const groupedCards = _.groupBy(hand, "rank");
  for (let start = 0; start <= Ranks.length - 3; start++) {
    const ranks = Ranks.slice(start, start + 3);
    if (!ranks.every(rank => groupedCards[rank] && groupedCards[rank].length >= 2)) {
      continue;
    }
    const cards = ranks
      .flatMap(rank => groupedCards[rank].slice(0, 2))
      .sort(compareCards);
    if (validCombination(cards) === Combinations.THREEPAIR) return cards;
  }
  return null;
}

function clockwiseDistance(playerID, startingPlayer) {
  return (Number(playerID) - startingPlayer + 4) % 4;
}
