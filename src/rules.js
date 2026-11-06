import { Ranks, Suits } from "./constants";

export const DEFAULT_RULES = {
  openingCard: { rank: "3", suit: "S" },
  threeSpadesFirstPlaceWhiteWin: false,
  chops: {
    threePairSingleTwo: false,
    threePairLead: true,
    fourKindSingleTwo: true,
    fourKindPairTwo: false,
    fourKindCutRound: false,
    fourPairSingleTwo: false,
    fourPairPairTwo: true,
    fourPairCutRound: true,
  },
  settlement: {
    mode: "winner-vs-others",
    baseStake: 1,
    rankPayouts: [3, 1, -1, -3],
    twoCardMultipliers: { S: 1, C: 2, D: 3, H: 4 },
  },
};

export const WHITE_WIN_MULTIPLIER = 2;
export const FAILED_THREE_PAIR_LEAD_MULTIPLIER = 4;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return (
    isPlainObject(value) &&
    keys.every(key => Object.prototype.hasOwnProperty.call(value, key)) &&
    Object.keys(value).every(key => keys.includes(key))
  );
}

function isAmount(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 1000000;
}

function isMultiplier(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 1000;
}

export function normalizeRules(value) {
  if (value === undefined) {
    return JSON.parse(JSON.stringify(DEFAULT_RULES));
  }
  if (value === null) throw new Error("Custom rules must be an object.");

  if (!hasExactKeys(value, Object.keys(DEFAULT_RULES))) {
    throw new Error("Invalid custom rules.");
  }

  const { openingCard, chops, settlement } = value;
  if (
    !isPlainObject(openingCard) ||
    !hasExactKeys(openingCard, ["rank", "suit"]) ||
    openingCard.rank !== "3" ||
    !Suits.includes(openingCard.suit)
  ) {
    throw new Error("The opening card must be one of the four 3s.");
  }

  if (
    typeof value.threeSpadesFirstPlaceWhiteWin !== "boolean" ||
    !hasExactKeys(chops, [
      "threePairSingleTwo",
      "threePairLead",
      "fourKindSingleTwo",
      "fourKindPairTwo",
      "fourKindCutRound",
      "fourPairSingleTwo",
      "fourPairPairTwo",
      "fourPairCutRound",
    ]) ||
    Object.values(chops).some(option => typeof option !== "boolean")
  ) {
    throw new Error("Invalid chop or white-win rules.");
  }

  if (
    !hasExactKeys(settlement, [
      "mode",
      "baseStake",
      "rankPayouts",
      "twoCardMultipliers",
    ]) ||
    !["winner-vs-others", "ranked"].includes(settlement.mode) ||
    !isAmount(settlement.baseStake) ||
    !Array.isArray(settlement.rankPayouts) ||
    settlement.rankPayouts.length !== 4 ||
    settlement.rankPayouts.some(
      value => !Number.isSafeInteger(value) || Math.abs(value) > 1000
    ) ||
    settlement.rankPayouts.reduce((sum, value) => sum + value, 0) !== 0 ||
    !hasExactKeys(settlement.twoCardMultipliers, Suits) ||
    Object.values(settlement.twoCardMultipliers).some(
      value => !isMultiplier(value)
    )
  ) {
    throw new Error("Invalid virtual settlement settings.");
  }

  return JSON.parse(JSON.stringify(value));
}

export function openingCardLabel(card) {
  const suitNames = { S: "♠", C: "♣", D: "♦", H: "♥" };
  return `${card.rank}${suitNames[card.suit]}`;
}

export function isCard(card) {
  return (
    isPlainObject(card) &&
    Ranks.includes(card.rank) &&
    Suits.includes(card.suit)
  );
}
