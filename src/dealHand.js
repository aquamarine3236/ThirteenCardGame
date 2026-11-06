import { Suits, Ranks } from "./constants";
import { compareCards } from "./moves/helper-functions/cardComparison";
const _ = require("lodash");

export function dealHand(random, openingCard, playerIDs = [0, 1, 2, 3]) {
  let deck = [];
  for (const suit of Suits) {
    for (const rank of Ranks) {
      deck.push({ suit, rank });
    }
  }

  const shuffleCount = random.Die(4);
  for (let i = 1 + shuffleCount; i > 0; i--) {
    deck = random.Shuffle(deck);
  }

  const activePlayerIDs = playerIDs.map(String);
  const dealtDeck = deck.slice(0, activePlayerIDs.length * 13);
  const openingCardIndex = deck.findIndex(
    card => card.rank === openingCard.rank && card.suit === openingCard.suit
  );
  if (openingCardIndex >= dealtDeck.length && dealtDeck.length > 0) {
    [dealtDeck[dealtDeck.length - 1], deck[openingCardIndex]] = [
      deck[openingCardIndex],
      dealtDeck[dealtDeck.length - 1],
    ];
  }

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

  return { players, firstPlayer, threeSpadesPlayer };
}
