import { INVALID_MOVE } from "boardgame.io/core";
import { Combinations } from "../constants";
import { dealHand } from "../dealHand";
import TienLen, { playerView } from "../TienLen";
import { clearStagingArea, relocateCards } from "../moves/cardAreaMoves";
import { cardsToCenter, startNextHand } from "../moves/cardPlayMoves";
import { DEFAULT_RULES, normalizeRules } from "../rules";

const deterministicRandom = {
  Die: () => 1,
  Shuffle: cards => cards.slice().reverse(),
};

describe("room participation and card selection", () => {
  it.each([2, 3, 4])("deals 13 cards to each of %i joined players", count => {
    const playerIDs = Array.from({ length: count }, (_, id) => String(id));
    const { players, firstPlayer } = dealHand(
      deterministicRandom,
      { rank: "3", suit: "S" },
      playerIDs
    );
    const cards = Object.values(players).flatMap(player => player.hand);

    expect(Object.keys(players)).toEqual(playerIDs);
    expect(cards).toHaveLength(count * 13);
    expect(Object.values(players).every(player => player.hand.length === 13)).toBe(
      true
    );
    expect(
      players[firstPlayer].hand.some(
        card => card.rank === "3" && card.suit === "S"
      )
    ).toBe(true);
    expect(new Set(cards.map(card => `${card.rank}${card.suit}`)).size).toBe(
      count * 13
    );
  });

  it("places an out-of-deal opening card in a uniformly selected seat position", () => {
    const openingCard = { rank: "3", suit: "S" };
    const firstSeatDeal = dealHand(
      { Die: () => 1, Shuffle: cards => cards.slice().reverse() },
      openingCard,
      ["0", "1"]
    );
    const lastSeatDeal = dealHand(
      { Die: sides => sides, Shuffle: cards => cards.slice().reverse() },
      openingCard,
      ["0", "1"]
    );

    expect(firstSeatDeal.firstPlayer).toBe(0);
    expect(lastSeatDeal.firstPlayer).toBe(1);
  });

  it("rejects duplicate player IDs and malformed shuffle output", () => {
    expect(() =>
      dealHand(deterministicRandom, { rank: "3", suit: "S" }, ["0", "0"])
    ).toThrow("unique players");
    expect(() =>
      dealHand(
        { Die: () => 1, Shuffle: () => Array(52).fill({ rank: "3", suit: "S" }) },
        { rank: "3", suit: "S" },
        ["0", "1"]
      )
    ).toThrow("complete, unique deck");
  });

  it("keeps a room unstarted and prevents card moves before the host starts it", () => {
    const before = TienLen.setup(
      { numPlayers: 4, random: deterministicRandom },
      {
        rules: normalizeRules({ ...DEFAULT_RULES, thoiTwoEnabled: false }),
        roomMode: true,
      }
    );
    expect(
      relocateCards(
        before,
        { currentPlayer: "0" },
        [{ rank: "3", suit: "S" }],
        "stagingArea"
      )
    ).toBe(INVALID_MOVE);

    expect(before.started).toBe(false);
    expect(before.rules.thoiTwoEnabled).toBe(false);
    expect(before.activePlayerIDs).toEqual([]);
    expect(Object.values(before.players).every(player => player.hand.length === 0)).toBe(
      true
    );
    expect(before.players["0"].stagingArea).toEqual([]);
  });

  it("rejects starting the next hand from a non-host player", () => {
    const G = {
      started: true,
      handComplete: true,
      previousWinner: "0",
    };

    expect(startNextHand(G, { playerID: "1" })).toBe(INVALID_MOVE);
  });

  it("exposes only the requesting player's hand and staging area", () => {
    const G = {
      activePlayerIDs: ["0", "1"],
      players: {
        "0": { hand: [{ rank: "3", suit: "S" }], stagingArea: [] },
        "1": { hand: [{ rank: "4", suit: "S" }], stagingArea: [] },
      },
    };

    expect(playerView(G, {}, "1").players).toEqual({
      "0": { hand: [], stagingArea: [] },
      "1": { hand: [{ rank: "4", suit: "S" }], stagingArea: [] },
    });
  });

  it("returns selected unplayed cards to sorted hand order", () => {
    const G = {
      started: true,
      activePlayerIDs: ["0"],
      pendingThreePairLeadPlayer: null,
      players: {
        "0": {
          hand: [
            { rank: "3", suit: "S" },
            { rank: "4", suit: "S" },
          ],
          stagingArea: [],
        },
      },
    };
    const ctx = { currentPlayer: "0" };

    relocateCards(G, ctx, [{ rank: "4", suit: "S" }], "stagingArea");
    clearStagingArea(G, ctx);

    expect(G.players["0"].hand).toEqual([
      { rank: "3", suit: "S" },
      { rank: "4", suit: "S" },
    ]);
    expect(G.players["0"].stagingArea).toEqual([]);
  });

  it("settles a two-player hand and keeps separate starting balances", () => {
    const G = {
      started: true,
      activePlayerIDs: ["0", "2"],
      turnOrder: [0, null, 2, null],
      players: {
        "0": {
          hand: [],
          stagingArea: [{ rank: "3", suit: "S" }],
        },
        "1": { hand: [], stagingArea: [] },
        "2": { hand: [{ rank: "4", suit: "S" }], stagingArea: [] },
        "3": { hand: [], stagingArea: [] },
      },
      cardsLeft: { 0: 1, 1: 0, 2: 1, 3: 0 },
      center: [],
      centerPlayerID: null,
      roundType: Combinations.ANY,
      winners: [],
      firstMove: false,
      rules: normalizeRules(DEFAULT_RULES),
      threeSpadesPlayer: null,
      netBalances: { 0: 100, 2: 100 },
      handStartBalances: { 0: 100, 2: 100 },
      settlementLog: [],
      handSettlementLogStart: 0,
      handResults: [],
      handNumber: 1,
      handComplete: false,
      previousWinner: null,
    };
    const ctx = {
      currentPlayer: "0",
      activePlayers: { 0: null, 1: "notTurn", 2: "notTurn", 3: "notTurn" },
      events: { setActivePlayers: jest.fn() },
    };

    cardsToCenter(G, ctx);

    expect(G.handComplete).toBe(true);
    expect(G.gameResults.rankings).toEqual(["0", "2"]);
    expect(G.netBalances).toEqual({ 0: 101, 2: 99 });
    expect(G.gameResults.netBalances).toEqual({ 0: 1, 2: -1 });
  });
});
