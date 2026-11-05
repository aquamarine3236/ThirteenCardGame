import { Suits, Ranks } from "./constants";
import { compareCards } from "./moves/helper-functions/cardComparison";
const _ = require("lodash");

export function dealHand(random, openingCard) {
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

  const hands = _.chunk(deck, 13).map(cards => cards.sort(compareCards));
  const players = {};
  let firstPlayer;
  let threeSpadesPlayer;

  hands.forEach((hand, playerID) => {
    if (hand.some(card => _.isEqual(card, openingCard))) {
      firstPlayer = playerID;
    }
    if (hand.some(card => card.rank === "3" && card.suit === "S")) {
      threeSpadesPlayer = playerID;
    }
    players[playerID] = { hand, stagingArea: [] };
  });

  return { players, firstPlayer, threeSpadesPlayer };
}
