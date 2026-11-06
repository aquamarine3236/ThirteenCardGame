import { Suits, Ranks } from "./constants";
import { compareCards } from "./moves/helper-functions/cardComparison";
const _ = require("lodash");

export function dealHand(random, openingCard, playerIDs = [0, 1, 2, 3]) {
  const activePlayerIDs = playerIDs.map(String);
  if (
    activePlayerIDs.length < 1 ||
    activePlayerIDs.length > 4 ||
    new Set(activePlayerIDs).size !== activePlayerIDs.length
  ) {
    throw new Error("A deal requires one to four unique players.");
  }
  if (!random || typeof random.Shuffle !== "function") {
    throw new Error("A random shuffle source is required to deal cards.");
  }

  const deck = [];
  for (const suit of Suits) {
    for (const rank of Ranks) {
      deck.push({ suit, rank });
    }
  }

  const shuffledDeck = random.Shuffle(deck);
  const expectedCards = new Set(
    deck.map(card => `${card.rank}${card.suit}`)
  );
  const shuffledCards = new Set(
    Array.isArray(shuffledDeck)
      ? shuffledDeck.map(card => `${card.rank}${card.suit}`)
      : []
  );
  if (
    !Array.isArray(shuffledDeck) ||
    shuffledDeck.length !== deck.length ||
    shuffledCards.size !== deck.length ||
    [...shuffledCards].some(card => !expectedCards.has(card))
  ) {
    throw new Error("The shuffle source must return a complete, unique deck.");
  }
  const cardsToDeal = activePlayerIDs.length * 13;
  const shuffledOpeningCardIndex = shuffledDeck.findIndex(
    card => card.rank === openingCard.rank && card.suit === openingCard.suit
  );
  if (shuffledOpeningCardIndex === -1) {
    throw new Error("The opening card must be in the deck.");
  }
  if (shuffledOpeningCardIndex >= cardsToDeal) {
    if (typeof random.Die !== "function") {
      throw new Error("A random integer source is required to place the opening card.");
    }
    const dealPosition = random.Die(cardsToDeal) - 1;
    if (!Number.isInteger(dealPosition) || dealPosition < 0 || dealPosition >= cardsToDeal) {
      throw new Error("The random integer source returned an invalid deal position.");
    }
    [shuffledDeck[dealPosition], shuffledDeck[shuffledOpeningCardIndex]] = [
      shuffledDeck[shuffledOpeningCardIndex],
      shuffledDeck[dealPosition],
    ];
  }

  const dealtDeck = shuffledDeck.slice(0, cardsToDeal);
  const hands = _.chunk(dealtDeck, 13).map(cards => cards.sort(compareCards));
  const players = {};
  let firstPlayer;
  let threeSpadesPlayer;

  hands.forEach((hand, playerID) => {
    if (hand.some(card => _.isEqual(card, openingCard))) {
      firstPlayer = Number(activePlayerIDs[playerID]);
    }
    if (hand.some(card => card.rank === "3" && card.suit === "S")) {
      threeSpadesPlayer = Number(activePlayerIDs[playerID]);
    }
    players[activePlayerIDs[playerID]] = { hand, stagingArea: [] };
  });

  const whiteWinPlayer = findWhiteWinPlayer(
    players,
    activePlayerIDs,
    firstPlayer
  );
  return { players, firstPlayer, threeSpadesPlayer, whiteWinPlayer };
}

export function findWhiteWinPlayer(players, playerIDs, tieBreakPlayer) {
  const activePlayerIDs = playerIDs.map(String);
  const tieBreakIndex = activePlayerIDs.indexOf(String(tieBreakPlayer));
  const orderedPlayerIDs =
    tieBreakIndex < 0
      ? activePlayerIDs
      : activePlayerIDs
          .slice(tieBreakIndex)
          .concat(activePlayerIDs.slice(0, tieBreakIndex));

  return (
    orderedPlayerIDs.find(playerID =>
      isWhiteWinHand(players[playerID] && players[playerID].hand)
    ) || null
  );
}

function isWhiteWinHand(hand) {
  if (!Array.isArray(hand) || hand.length !== 13) return false;

  if (hand.filter(card => card.rank === "2").length === 4) return true;

  const rankCounts = hand.reduce((counts, card) => {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
    return counts;
  }, {});
  const pairCount = Object.values(rankCounts).reduce(
    (count, rankCount) => count + Math.floor(rankCount / 2),
    0
  );
  if (pairCount >= 6) return true;

  return Ranks.every(rank => rankCounts[rank] === 1);
}
