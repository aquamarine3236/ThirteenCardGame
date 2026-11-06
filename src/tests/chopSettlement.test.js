import { Combinations } from "../constants";
import {
  cardsToCenter,
  passTurn,
} from "../moves/cardPlayMoves";
import { DEFAULT_RULES, normalizeRules } from "../rules";

function makeState(overrides = {}) {
  const rules = normalizeRules({
    ...DEFAULT_RULES,
    settlement: { ...DEFAULT_RULES.settlement, baseStake: 10 },
  });
  return {
    started: true,
    activePlayerIDs: ["0", "1", "2", "3"],
    players: {
      0: { hand: [], stagingArea: [] },
      1: { hand: [], stagingArea: [] },
      2: { hand: [], stagingArea: [] },
      3: { hand: [], stagingArea: [] },
    },
    cardsLeft: { 0: 13, 1: 13, 2: 13, 3: 13 },
    center: [{ rank: "2", suit: "S" }],
    centerPlayerID: "3",
    roundType: Combinations.SINGLE,
    turnOrder: [0, 1, 2, 3],
    winners: [],
    firstMove: false,
    rules,
    netBalances: { 0: 100, 1: 100, 2: 100, 3: 100 },
    handStartBalances: { 0: 100, 1: 100, 2: 100, 3: 100 },
    settlementLog: [],
    handSettlementLogStart: 0,
    handResults: [],
    handNumber: 1,
    handComplete: false,
    previousWinner: null,
    pendingThreePairLeadPlayer: null,
    openingThreePairLeadPlayer: null,
    openingThreePairLeadPenaltyApplied: false,
    chopChain: null,
    twoCardPot: 10,
    ...overrides,
  };
}

function makeContext(currentPlayer) {
  return {
    currentPlayer,
    events: {
      endTurn: jest.fn(),
      setActivePlayers: jest.fn(),
      setStage: jest.fn(),
    },
  };
}

function passUntilChopSettles(G, playerIDs) {
  playerIDs.forEach(playerID => passTurn(G, makeContext(playerID)));
}

describe("stacked chop settlement", () => {
  it("collects each played 2 and pays once to the last chopper", () => {
    const G = makeState({
      players: {
        0: { hand: [], stagingArea: [] },
        1: {
          hand: [],
          stagingArea: [{ rank: "2", suit: "H" }],
        },
        2: {
          hand: [],
          stagingArea: [
            { rank: "6", suit: "S" },
            { rank: "6", suit: "C" },
            { rank: "6", suit: "D" },
            { rank: "6", suit: "H" },
          ],
        },
        3: { hand: [], stagingArea: [] },
      },
    });

    cardsToCenter(G, makeContext("1"));
    expect(G.twoCardPot).toBe(50);
    cardsToCenter(G, makeContext("2"));

    expect(G.chopChain).toMatchObject({
      amount: 50,
      payer: "1",
      recipient: "2",
      multiplier: 1,
    });
    expect(G.netBalances).toEqual({ 0: 100, 1: 100, 2: 100, 3: 100 });
    expect(G.settlementLog).toEqual([]);

    passUntilChopSettles(G, ["3", "0", "1"]);

    expect(G.netBalances).toEqual({ 0: 100, 1: 50, 2: 150, 3: 100 });
    expect(G.settlementLog).toHaveLength(1);
    expect(G.settlementLog[0]).toMatchObject({
      type: "chop-fourKindSingleTwo",
      from: "1",
      to: "2",
      amount: 50,
      multiplier: 1,
      overchops: 0,
    });
  });

  it("doubles the penalty once when a four-pair chops a quad", () => {
    const fourKind = ["S", "C", "D", "H"].map(suit => ({
      rank: "6",
      suit,
    }));
    const fourPairs = ["7", "8", "9", "T"].flatMap(rank =>
      ["S", "C"].map(suit => ({ rank, suit }))
    );
    const G = makeState({
      centerPlayerID: "1",
      players: {
        0: { hand: [], stagingArea: fourKind },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: fourPairs },
        3: { hand: [], stagingArea: [] },
      },
    });

    cardsToCenter(G, makeContext("0"));
    cardsToCenter(G, makeContext("2"));
    expect(G.chopChain).toMatchObject({
      amount: 10,
      payer: "0",
      recipient: "2",
      multiplier: 2,
      overchops: 1,
    });

    passUntilChopSettles(G, ["3", "0", "1"]);

    expect(G.netBalances).toEqual({ 0: 80, 1: 100, 2: 120, 3: 100 });
    expect(G.settlementLog).toHaveLength(1);
    expect(G.settlementLog[0]).toMatchObject({
      from: "0",
      to: "2",
      amount: 20,
      multiplier: 2,
      overchops: 1,
    });
  });

  it("doubles again when a higher three-pair chops a lower three-pair", () => {
    const lowThreePairs = ["3", "4", "5"].flatMap(rank =>
      ["S", "C"].map(suit => ({ rank, suit }))
    );
    const highThreePairs = ["4", "5", "6"].flatMap(rank =>
      ["D", "H"].map(suit => ({ rank, suit }))
    );
    const G = makeState({
      players: {
        0: { hand: [], stagingArea: lowThreePairs },
        1: { hand: [], stagingArea: highThreePairs },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
    });

    cardsToCenter(G, makeContext("0"));
    cardsToCenter(G, makeContext("1"));
    expect(G.chopChain).toMatchObject({
      amount: 10,
      payer: "0",
      recipient: "1",
      multiplier: 2,
      overchops: 1,
    });

    passUntilChopSettles(G, ["2", "3", "0"]);

    expect(G.netBalances).toEqual({ 0: 80, 1: 120, 2: 100, 3: 100 });
    expect(G.settlementLog).toHaveLength(1);
    expect(G.settlementLog[0]).toMatchObject({
      from: "0",
      to: "1",
      amount: 20,
      multiplier: 2,
      overchops: 1,
    });
  });

  it("multiplies once for every stronger chop and excludes earlier choppers", () => {
    const threePairs = ["3", "4", "5"].flatMap(rank =>
      ["S", "C"].map(suit => ({ rank, suit }))
    );
    const fourKind = ["S", "C", "D", "H"].map(suit => ({
      rank: "6",
      suit,
    }));
    const fourPairs = ["7", "8", "9", "T"].flatMap(rank =>
      ["S", "C"].map(suit => ({ rank, suit }))
    );
    const G = makeState({
      players: {
        0: { hand: [], stagingArea: threePairs },
        1: { hand: [], stagingArea: fourKind },
        2: { hand: [], stagingArea: fourPairs },
        3: { hand: [], stagingArea: [] },
      },
    });

    cardsToCenter(G, makeContext("0"));
    cardsToCenter(G, makeContext("1"));
    cardsToCenter(G, makeContext("2"));
    expect(G.chopChain).toMatchObject({
      amount: 10,
      payer: "1",
      recipient: "2",
      multiplier: 4,
      overchops: 2,
    });
    expect(G.netBalances).toEqual({ 0: 100, 1: 100, 2: 100, 3: 100 });

    passUntilChopSettles(G, ["3", "0", "1"]);

    expect(G.netBalances).toEqual({ 0: 100, 1: 60, 2: 140, 3: 100 });
    expect(G.settlementLog).toHaveLength(1);
    expect(G.settlementLog[0]).toMatchObject({
      from: "1",
      to: "2",
      amount: 40,
      multiplier: 4,
      overchops: 2,
    });
  });
});
